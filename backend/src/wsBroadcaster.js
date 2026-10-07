/**
 * Native AWS API Gateway WebSocket Broadcaster Module
 * Broadcasts real-time auction events (boat:arrived, lot:opened, bid:placed, lot:closed, price:trend-update)
 * to connected clients via DynamoDB connection tracking and API Gateway Management API.
 * Automatically cleans up stale connections (410 Gone / 404).
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  ScanCommand, 
  QueryCommand, 
  DeleteCommand 
} = require('@aws-sdk/lib-dynamodb');
const { 
  ApiGatewayManagementApiClient, 
  PostToConnectionCommand 
} = require('@aws-sdk/client-apigatewaymanagementapi');

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'malpe-websocket-connections-dev';

// Helper to construct ApiGatewayManagementApiClient dynamically
const getManagementClient = (customEndpoint) => {
  const endpoint = customEndpoint || process.env.WEBSOCKET_API_ENDPOINT || 'http://localhost:3001';
  return new ApiGatewayManagementApiClient({
    endpoint,
    region: process.env.AWS_REGION || 'ap-south-1'
  });
};

/**
 * Sends a message payload to a single WebSocket connectionId.
 * Cleans up stale connections from DynamoDB when HTTP 410 Gone or 404 is encountered.
 */
const sendToConnection = async (connectionId, payload, mgmtClient) => {
  const client = mgmtClient || getManagementClient();
  const data = Buffer.from(JSON.stringify(payload));

  try {
    await client.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: data
    }));
    return { success: true, connectionId };
  } catch (err) {
    const statusCode = err.$metadata ? err.$metadata.httpStatusCode : null;
    const isGone = statusCode === 410 || 
                   err.name === 'GoneException' || 
                   statusCode === 404 || 
                   (err.name === 'ResourceNotFoundException' && err.message && err.message.toLowerCase().includes('connection'));

    if (isGone) {
      console.warn(`[wsBroadcaster] Connection ${connectionId} is stale (410 Gone/404). Removing from DynamoDB...`);
      try {
        await docClient.send(new DeleteCommand({
          TableName: CONNECTIONS_TABLE,
          Key: { connectionId }
        }));
        console.log(`[wsBroadcaster] Successfully removed stale connection ${connectionId}`);
      } catch (delErr) {
        console.error(`[wsBroadcaster] Failed to remove stale connection ${connectionId}:`, delErr.message);
      }
      return { success: false, connectionId, stale: true };
    }

    console.warn(`[wsBroadcaster] Failed to send message to ${connectionId}: ${err.message}`);
    return { success: false, connectionId, error: err.message };
  }
};

/**
 * Broadcasts payload to ALL connected clients in DynamoDB CONNECTIONS_TABLE.
 */
const broadcastToAll = async (payload, mgmtClient) => {
  try {
    const scanResult = await docClient.send(new ScanCommand({
      TableName: CONNECTIONS_TABLE,
      ProjectionExpression: 'connectionId'
    }));

    const connections = scanResult.Items || [];
    if (connections.length === 0) {
      return { total: 0, sent: 0, stale: 0 };
    }

    const client = mgmtClient || getManagementClient();
    const results = await Promise.all(
      connections.map(conn => sendToConnection(conn.connectionId, payload, client))
    );

    const sent = results.filter(r => r.success).length;
    const stale = results.filter(r => r.stale).length;
    return { total: connections.length, sent, stale };
  } catch (err) {
    console.error('[wsBroadcaster] Error scanning CONNECTIONS_TABLE for broadcastToAll:', err.message);
    return { total: 0, sent: 0, stale: 0, error: err.message };
  }
};

/**
 * Broadcasts payload specifically to clients subscribed to a given lotId via LotIdIndex GSI.
 */
const broadcastToLot = async (lotId, payload, mgmtClient) => {
  try {
    const queryResult = await docClient.send(new QueryCommand({
      TableName: CONNECTIONS_TABLE,
      IndexName: 'LotIdIndex',
      KeyConditionExpression: 'lotId = :lotId',
      ExpressionAttributeValues: {
        ':lotId': lotId
      },
      ProjectionExpression: 'connectionId'
    }));

    const connections = queryResult.Items || [];
    if (connections.length === 0) {
      return { total: 0, sent: 0, stale: 0 };
    }

    const client = mgmtClient || getManagementClient();
    const results = await Promise.all(
      connections.map(conn => sendToConnection(conn.connectionId, payload, client))
    );

    const sent = results.filter(r => r.success).length;
    const stale = results.filter(r => r.stale).length;
    return { total: connections.length, sent, stale };
  } catch (err) {
    console.error(`[wsBroadcaster] Error querying LotIdIndex for lot ${lotId}:`, err.message);
    return { total: 0, sent: 0, stale: 0, error: err.message };
  }
};

// Domain event broadcast functions matching legacy Socket.IO event names & signatures

const broadcastBoatArrived = async (boat, mgmtClient) => {
  const payload = { event: 'boat:arrived', data: boat };
  return await broadcastToAll(payload, mgmtClient);
};

const broadcastLotOpened = async (lot, mgmtClient) => {
  const payload = { event: 'lot:opened', data: lot };
  return await broadcastToAll(payload, mgmtClient);
};

const broadcastBidPlaced = async (bidData, mgmtClient) => {
  const payload = { event: 'bid:placed', data: bidData };
  return await broadcastToAll(payload, mgmtClient);
};

const broadcastLotClosed = async (lotData, mgmtClient) => {
  const payload = { event: 'lot:closed', data: lotData };
  return await broadcastToAll(payload, mgmtClient);
};

const broadcastPriceTrend = async (trendData, mgmtClient) => {
  const payload = { event: 'price:trend-update', data: trendData };
  return await broadcastToAll(payload, mgmtClient);
};

module.exports = {
  sendToConnection,
  broadcastToAll,
  broadcastToLot,
  broadcastBoatArrived,
  broadcastLotOpened,
  broadcastBidPlaced,
  broadcastLotClosed,
  broadcastPriceTrend
};
