"use client"

import * as React from "react"
import image from "../../build-resources/icons/icon.png"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  BrainCircuitIcon,
  TvIcon,
  RadioIcon,
  FileTextIcon,
  HelpCircleIcon,
  SunIcon,
  MoonIcon,
  CastIcon,
  PaletteIcon,
} from "lucide-react"
import {
  useSettingsDialogStore,
  type SettingsSection,
} from "@/lib/settings-dialog"
import { useTheme } from "@/components/theme-provider"
import { BroadcastOutputsDialog } from "@/components/broadcast/broadcast-outputs-dialog"
import { useBroadcastStore } from "@/stores"

type NavItem = {
  id: SettingsSection | "dashboard"
  label: string
  icon: React.ReactNode
}

const settingsNav: NavItem[] = [
  { id: "speech", label: "Speech Recognition", icon: <BrainCircuitIcon /> },
  { id: "display", label: "Display Mode", icon: <TvIcon /> },
  { id: "remote", label: "Remote Control", icon: <RadioIcon /> },
  { id: "diagnostics", label: "Diagnostics", icon: <FileTextIcon /> },
  { id: "help", label: "Help", icon: <HelpCircleIcon /> },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isOpen = useSettingsDialogStore((s) => s.isOpen)
  const activeSection = useSettingsDialogStore((s) => s.activeSection)
  const openSettings = useSettingsDialogStore((s) => s.openSettings)
  // const closeSettings = useSettingsDialogStore((s) => s.closeSettings)
  const { theme, setTheme } = useTheme()
  const [broadcastOpen, setBroadcastOpen] = React.useState(false)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex h-8 items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-6 items-center justify-center">
            <img src={image} alt="Aleph Logo" className="h-4 w-4" />
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNav.map((item) => {
                const isActive = isOpen && activeSection === item.id
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={isActive}
                      onClick={() => openSettings(item.id as SettingsSection)}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip={
                theme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
              <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Broadcast"
              onClick={() => setBroadcastOpen(true)}
            >
              <CastIcon />
              <span>Broadcast</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Theme Designer"
              onClick={() => useBroadcastStore.getState().setDesignerOpen(true)}
            >
              <PaletteIcon />
              <span>Theme Designer</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
      <BroadcastOutputsDialog
        open={broadcastOpen}
        onOpenChange={setBroadcastOpen}
      />
    </Sidebar>
  )
}
