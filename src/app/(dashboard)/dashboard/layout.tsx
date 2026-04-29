import DashboardShell from "@/components/dashboard/DashboardShell"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell schoolName="Green Valley Academy" userName="Akosua Mensah" role="ADMIN">
      {children}
    </DashboardShell>
  )
}
