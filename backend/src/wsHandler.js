/**
 * Native AWS API Gateway WebSocket Lambda Handlers
 * Implements $connect, $disconnect, and $default (ping/pong, state:sync action router) using AWS SDK v3.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  PutCommand, 
  DeleteCommand,
  UpdateCommand 
} = require('@aws-sdk/lib-dynamodb');
const { 
  ApiGatewayManagementApiClient, 
  PostToConnectionCommand 
} = require('@aws-sdk/client-apigatewaymanagementapi');
const repo = require('./config/repository');
const connectDB = require('./config/db');

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'malpe-websocket-connections-dev';

// Helper to construct ApiGatewayManagementApiClient dynamically
const getManagementClient = (event) => {
  const domain = event.requestContext ? event.requestContext.domainName : null;
  const stage = event.requestContext ? event.requestContext.stage : null;
  const endpoint = (domain && stage && domain !== 'localhost')
    ? `https://${domain}/${stage}`
    : 'http://localhost:3001';
    
  return new ApiGatewayManagementApiClient({
    endpoint,
    region: process.env.AWS_REGION || 'ap-south-1'
  });
};

/**
 * Fetch initial state snapshot using existing repository methods
 * Obtains activeLots, recentBoats, and recentTrends matching legacy Socket.IO state:sync logic
 */
const fetchStateSyncData = async () => {
  let activeLots = [];
  let recentBoats = [];
  let recentTrends = [];

  try {
    await connectDB();
    activeLots = await repo.getLots({ status: 'open' });
    recentBoats = await repo.getBoats();
    recentTrends = await repo.getPriceTrends(null, 20);
  } catch (err) {
    console.warn('[WebSocket fetchStateSyncData Warning] DB fetch fallback:', err.message);
  }

  return {
    event: 'state:sync',
    data: {
      activeLots,
      recentBoats,
      recentTrends,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * $connect Handler
 * Stores new connection record in DynamoDB table
 */
module.exports.connect = async (event) => {
  const connectionId = event.requestContext ? event.requestContext.connectionId : 'test-conn-id';
  const connectedAt = new Date().toISOString();

  console.log(`[WebSocket $connect] New connection: ${connectionId}`);

  try {
    await docClient.send(new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: {
        connectionId,
        connectedAt,
        ttl: Math.floor(Date.now() / 1000) + 86400 // 24-hour TTL safety
      }
    }));
    return { statusCode: 200, body: 'Connected.' };
  } catch (err) {
    console.error(`[WebSocket $connect Error]`, err);
    return { statusCode: 500, body: 'Failed to connect: ' + err.message };
  }
};

/**
 * $disconnect Handler
 * Removes connection record from DynamoDB table
 */
module.exports.disconnect = async (event) => {
  const connectionId = event.requestContext ? event.requestContext.connectionId : 'test-conn-id';

  console.log(`[WebSocket $disconnect] Client disconnected: ${connectionId}`);

  try {
    await docClient.send(new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId }
    }));
    return { statusCode: 200, body: 'Disconnected.' };
  } catch (err) {
    console.error(`[WebSocket $disconnect Error]`, err);
    return { statusCode: 500, body: 'Failed to disconnect: ' + err.message };
  }
};

/**
 * $default Handler
 * Routes client actions (ping/pong, state:sync, etc.)
 */
module.exports.default = async (event) => {
  const connectionId = event.requestContext ? event.requestContext.connectionId : 'test-conn-id';
  let body = {};

  try {
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }
  } catch (e) {
    console.warn(`[WebSocket $default] Could not parse event body:`, event.body);
  }

  console.log(`[WebSocket $default] Received message from ${connectionId}:`, body);

  const action = body.action;

  // Checkpoint 3 Action: ping -> pong response
  if (action === 'ping') {
    const responsePayload = {
      event: 'pong',
      data: {
        timestamp: new Date().toISOString()
      }
    };

    try {
      const mgmtClient = getManagementClient(event);
      await mgmtClient.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(responsePayload))
      }));
      return { statusCode: 200, body: 'Pong sent.' };
    } catch (err) {
      console.log(`[WebSocket $default Management API fallback for testing]`, err.message);
      return { 
        statusCode: 200, 
        body: JSON.stringify(responsePayload) 
      };
    }
  }

  // Checkpoint 4 Action: state:sync / get:state response using existing repository methods
  if (action === 'get:state' || action === 'state:sync') {
    try {
      const syncPayload = await fetchStateSyncData();
      try {
        const mgmtClient = getManagementClient(event);
        await mgmtClient.send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(JSON.stringify(syncPayload))
        }));
        return { statusCode: 200, body: 'state:sync sent.' };
      } catch (mgmtErr) {
        console.log(`[WebSocket state:sync Management API fallback]`, mgmtErr.message);
        return { 
          statusCode: 200, 
          body: JSON.stringify(syncPayload) 
        };
      }
    } catch (dbErr) {
      console.error(`[WebSocket state:sync Error]`, dbErr);
      return { statusCode: 500, body: 'Failed to fetch state sync data' };
    }
  }

  // Checkpoint 5 Action: join:lot - associate connection with a specific lot room
  if (action === 'join:lot') {
    const lotId = body.lotId || (body.data && body.data.lotId);
    if (!lotId) {
      console.warn(`[WebSocket join:lot] Missing lotId from ${connectionId}`);
      return { statusCode: 400, body: 'lotId is required for join:lot' };
    }

    try {
      await docClient.send(new UpdateCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId },
        UpdateExpression: 'SET lotId = :lotId',
        ExpressionAttributeValues: {
          ':lotId': lotId
        }
      }));
      console.log(`[WebSocket join:lot] Connection ${connectionId} joined lot ${lotId}`);
      return { statusCode: 200, body: `Joined lot ${lotId}` };
    } catch (err) {
      console.error(`[WebSocket join:lot Error]`, err);
      return { statusCode: 500, body: 'Failed to join lot: ' + err.message };
    }
  }

  // Checkpoint 5 Action: leave:lot - remove lot association from connection
  if (action === 'leave:lot') {
    try {
      await docClient.send(new UpdateCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId },
        UpdateExpression: 'REMOVE lotId'
      }));
      console.log(`[WebSocket leave:lot] Connection ${connectionId} left lot`);
      return { statusCode: 200, body: 'Left lot' };
    } catch (err) {
      console.error(`[WebSocket leave:lot Error]`, err);
      return { statusCode: 500, body: 'Failed to leave lot: ' + err.message };
    }
  }

  return { statusCode: 200, body: 'Unrecognized action.' };
};

module.exports.fetchStateSyncData = fetchStateSyncData;
