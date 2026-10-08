import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatedRoutes } from "@/components/AnimatedRoutes";
import { PageTransition } from "@/components/PageTransition";
import { AuthProvider } from "@/lib/AuthContext";
import AppShell from "@/components/AppShell";
import Index from "./pages/Index";
import CheckinDetail from "./pages/CheckinDetail";
import Timeline from "./pages/Timeline";
import Stats from "./pages/Stats";
import Wishlist from "./pages/Wishlist";
import Me from "./pages/Me";
import NotFound from "./pages/NotFound";

// 低频页面按需加载，缩短首屏体积
const Login = lazy(() => import("./pages/Login"));
const SharePage = lazy(() => import("./pages/SharePage"));
const AuthCallback = lazy(() => import("./lib/auth-callback"));

/** 懒加载页面的轻量占位 */
function RouteFallback() {
  return (
    <div className="flex min-h-full items-center justify-center py-20">
      <span
        className="h-6 w-6 animate-spin rounded-full border-2"
        style={{ borderColor: 'var(--border)', borderTopColor: 'var(--primary)' }}
      />
    </div>
  );
}

/**
 * Configure TanStack Query client with optimized defaults
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AuthProvider>
          <BrowserRouter>
            <AppShell>
              <Suspense fallback={<RouteFallback />}>
                <AnimatedRoutes>
                  <Route path="/" data-genie-title="地图主页" data-genie-key="Home" element={<PageTransition transition="fade"><Index /></PageTransition>} />
                  {/* 打卡表单以全屏抽屉形式呈现，路由仅占位，真实内容由 AppShell 的 CheckinSheet 渲染 */}
                  <Route path="/checkin/new" data-genie-title="新增打卡" data-genie-key="CheckinNew" element={<PageTransition transition="slide-up"><div /></PageTransition>} />
                  <Route path="/checkin/:id" data-genie-title="打卡详情" data-genie-key="CheckinDetail" element={<PageTransition transition="slide-fade"><CheckinDetail /></PageTransition>} />
                  <Route path="/checkin/:id/edit" data-genie-title="编辑打卡" data-genie-key="CheckinEdit" element={<PageTransition transition="slide-up"><div /></PageTransition>} />
                  {/* 新增心愿表单同样走抽屉，路由仅占位，真实内容由 AppShell 的 WishSheet 渲染 */}
                  <Route path="/wish/new" data-genie-title="新增心愿" data-genie-key="WishNew" element={<PageTransition transition="slide-up"><div /></PageTransition>} />
                  <Route path="/timeline" data-genie-title="时间线" data-genie-key="Timeline" element={<PageTransition transition="slide-fade"><Timeline /></PageTransition>} />
                  <Route path="/stats" data-genie-title="旅行统计" data-genie-key="Stats" element={<PageTransition transition="slide-fade"><Stats /></PageTransition>} />
                  <Route path="/wishlist" data-genie-title="心愿点亮" data-genie-key="Wishlist" element={<PageTransition transition="slide-fade"><Wishlist /></PageTransition>} />
                  <Route path="/login" data-genie-title="登录" data-genie-key="Login" element={<PageTransition transition="fade"><Login /></PageTransition>} />
                  <Route path="/me" data-genie-title="我的" data-genie-key="Me" element={<PageTransition transition="fade"><Me /></PageTransition>} />
                  <Route path="/share/:publicId" data-genie-title="分享页" data-genie-key="Share" element={<PageTransition transition="fade"><SharePage /></PageTransition>} />
                  <Route path="/auth/callback" data-genie-title="登录回调" data-genie-key="AuthCallback" element={<PageTransition transition="fade"><AuthCallback /></PageTransition>} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" data-genie-key="NotFound" data-genie-title="Not Found" element={<PageTransition transition="fade"><NotFound /></PageTransition>} />
                </AnimatedRoutes>
              </Suspense>
            </AppShell>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App
