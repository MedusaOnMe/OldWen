import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletContextProvider } from "@/contexts/WalletContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";
import { CampaignsPage } from "@/pages/Campaigns";
import { CampaignDetailPage } from "@/pages/CampaignDetail";
import { CreateCampaignPage } from "@/pages/CreateCampaign";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { useEffect } from "react";
import { wsService } from "@/services/websocket";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/campaigns" component={CampaignsPage} />
      <Route path="/campaign/:id" component={CampaignDetailPage} />
      <Route path="/create-campaign" component={CreateCampaignPage} />
      <Route path="/admin" component={AdminDashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Temporarily disabled WebSocket - using Helius webhooks for real-time updates
  // useEffect(() => {
  //   // Connect to WebSocket on app start
  //   wsService.connect();
    
  //   return () => {
  //     wsService.disconnect();
  //   };
  // }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <WalletContextProvider>
          <TooltipProvider>
            <Toaster />
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </TooltipProvider>
        </WalletContextProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
