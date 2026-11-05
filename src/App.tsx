import { Dashboard } from "@/components/layout/dashboard"
import { useBroadcastOutputs } from "@/hooks/use-broadcast-outputs"
import { useRemoteControl } from "@/hooks/use-remote-control"
import { useUpdaterEvents } from "@/hooks/use-updater"
import { UpdateBanner } from "@/components/updater/update-banner"
import { TutorialOverlay } from "@/components/tutorial/tutorial-overlay"
import { Toaster } from "sonner"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function App() {
  useRemoteControl()
  useBroadcastOutputs()
  useUpdaterEvents()
  return (
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex h-svh flex-col overflow-hidden">
        <Dashboard />
      </SidebarInset>
      <UpdateBanner />
      <TutorialOverlay />
      <Toaster position="bottom-right" />
    </SidebarProvider>
  )
}

export default App
