import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PinGate } from "@/components/PinGate";
import { ThemeProvider } from "@/hooks/useTheme";
import Index from "./pages/Index.tsx";
import Schedule from "./pages/Schedule.tsx";
import Budget from "./pages/Budget.tsx";
import Investments from "./pages/Investments.tsx";
import NetWorth from "./pages/NetWorth.tsx";
import Kitchen from "./pages/Kitchen.tsx";
import Health from "./pages/Health.tsx";
import Chat from "./pages/Chat.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PinGate>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/net-worth" element={<NetWorth />} />
              <Route path="/kitchen" element={<Kitchen />} />
              <Route path="/health" element={<Health />} />
              <Route path="/chat" element={<Chat />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </PinGate>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
