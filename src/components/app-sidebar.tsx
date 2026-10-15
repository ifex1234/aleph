"use client"

import * as React from "react"
// import image from "../../build-resources/icons/icon.png"
import {
  Sidebar,
  SidebarContent,
  SidebarRail,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
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
  HeartHandshakeIcon,
  SunIcon,
  MoonIcon,
  CastIcon,
  PaletteIcon,
  NotebookPen,
  MusicIcon,
  BookOpenIcon,
  PresentationIcon,
} from "lucide-react"
import {
  useSettingsDialogStore,
  type SettingsSection,
} from "@/lib/settings-dialog"
import { useTheme } from "@/components/theme-provider"
import { BroadcastOutputsDialog } from "@/components/broadcast/broadcast-outputs-dialog"
import { PanelSheet } from "@/components/ui/panel-sheet"
import { NotesPanel } from "@/components/panels/notes-panel"
import { LyricsPanel } from "@/components/panels/lyrics-panel"
import { HymnsPanel } from "@/components/panels/hymns-panel"
import { SlidesPanel } from "@/components/panels/slides-panel"
import { useNotesStore, useLyricsStore, useHymnStore, useSlidesStore, useBroadcastStore } from "@/stores"

type NavItem = {
  id: SettingsSection | "dashboard"
  label: string
  icon: React.ReactNode
  tourId?: string
}

const settingsNav: NavItem[] = [
  { id: "speech", label: "Speech Recognition", icon: <BrainCircuitIcon /> },
  { id: "display", label: "Display Mode", icon: <TvIcon /> },
  { id: "remote", label: "Remote Control", icon: <RadioIcon /> },
  { id: "diagnostics", label: "Diagnostics", icon: <FileTextIcon /> },
  { id: "help", label: "Help", icon: <HelpCircleIcon /> },
  { id: "support", label: "Support", icon: <HeartHandshakeIcon />, tourId: "support" },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isOpen = useSettingsDialogStore((s) => s.isOpen)
  const activeSection = useSettingsDialogStore((s) => s.activeSection)
  const openSettings = useSettingsDialogStore((s) => s.openSettings)
  // const closeSettings = useSettingsDialogStore((s) => s.closeSettings)
  const { theme, setTheme } = useTheme()
  const [broadcastOpen, setBroadcastOpen] = React.useState(false)
  const notesOpen = useNotesStore((s) => s.isSidebarOpen)
  const lyricsOpen = useLyricsStore((s) => s.isSidebarOpen)
  const hymnsOpen = useHymnStore((s) => s.isSidebarOpen)
  const slidesOpen = useSlidesStore((s) => s.isSidebarOpen)

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* <SidebarHeader>
        <div className="flex h-8 items-center gap-2 px-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex size-6 items-center justify-center">
            <img src={image} alt="Aleph Logo" className="h-4 w-4" />
          </div>
        </div>
      </SidebarHeader> */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNav.map((item) => {
                const isActive = isOpen && activeSection === item.id
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      tooltip={item.label}
                      isActive={isActive}
                      size="sm"
                      data-tour={item.tourId}
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
        <SidebarGroup>
          <SidebarGroupLabel>Present</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Broadcast"
                  size="sm"
                  data-tour="broadcast"
                  onClick={() => setBroadcastOpen(true)}
                >
                  <CastIcon />
                  <span>Broadcast</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Theme Designer"
                  size="sm"
                  data-tour="theme"
                  onClick={() => useBroadcastStore.getState().setDesignerOpen(true)}
                >
                  <PaletteIcon />
                  <span>Theme Designer</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Notes"
                  size="sm"
                  data-tour="notes"
                  onClick={() => useNotesStore.getState().setSidebarOpen(true)}
                >
                  <NotebookPen />
                  <span>Notes</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Lyrics"
                  size="sm"
                  data-tour="lyrics"
                  onClick={() => useLyricsStore.getState().setSidebarOpen(true)}
                >
                  <MusicIcon />
                  <span>Lyrics</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Hymns"
                  size="sm"
                  data-tour="hymns"
                  onClick={() => useHymnStore.getState().setSidebarOpen(true)}
                >
                  <BookOpenIcon />
                  <span>Hymns</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip="Slides"
                  size="sm"
                  data-tour="slides"
                  onClick={() => useSlidesStore.getState().setSidebarOpen(true)}
                >
                  <PresentationIcon />
                  <span>Slides</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={
                    theme === "dark"
                      ? "Switch to light mode"
                      : "Switch to dark mode"
                  }
                  size="sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                  <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
      <BroadcastOutputsDialog
        open={broadcastOpen}
        onOpenChange={setBroadcastOpen}
      />
      <PanelSheet
        open={notesOpen}
        onOpenChange={(open) => useNotesStore.getState().setSidebarOpen(open)}
        title="Notes"
      >
        <NotesPanel />
      </PanelSheet>
      <PanelSheet
        open={lyricsOpen}
        onOpenChange={(open) => useLyricsStore.getState().setSidebarOpen(open)}
        title="Lyrics"
      >
        <LyricsPanel />
      </PanelSheet>
      <PanelSheet
        open={hymnsOpen}
        onOpenChange={(open) => useHymnStore.getState().setSidebarOpen(open)}
        title="Hymns"
      >
        <HymnsPanel />
      </PanelSheet>
      <PanelSheet
        open={slidesOpen}
        onOpenChange={(open) => useSlidesStore.getState().setSidebarOpen(open)}
        title="Slides"
      >
        <SlidesPanel />
      </PanelSheet>
    </Sidebar>
  )
}
