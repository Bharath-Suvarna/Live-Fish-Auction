import { Routes } from '@angular/router';
import { HomeDashboardComponent } from './pages/home-dashboard/home-dashboard.component';
import { LotDetailComponent } from './pages/lot-detail/lot-detail.component';
import { PriceTrendsComponent } from './pages/price-trends/price-trends.component';
import { BoatArrivalsComponent } from './pages/boat-arrivals/boat-arrivals.component';
import { AdminPanelComponent } from './pages/admin-panel/admin-panel.component';
import { LoginComponent } from './pages/login/login.component';

export const routes: Routes = [
  { path: '', component: HomeDashboardComponent },
  { path: 'lots/:id', component: LotDetailComponent },
  { path: 'trends', component: PriceTrendsComponent },
  { path: 'boats', component: BoatArrivalsComponent },
  { path: 'admin', component: AdminPanelComponent },
  { path: 'login', component: LoginComponent },
  { path: '**', redirectTo: '' }
];
