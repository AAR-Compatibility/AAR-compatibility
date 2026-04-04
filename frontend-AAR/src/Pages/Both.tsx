// This page lets SRD holders submit one combined form for both their tanker and their receiver.
import SRDHolderFormWorkspace from './SRD_holderFormWorkspace'

type BothPageProps = {
  onLogout: () => void
  onOpenViewer: () => void
  onOpenMySrd: () => void
}

export default function BothPage(props: BothPageProps) {
  return (
    <SRDHolderFormWorkspace
      {...props}
      pageTitle="Tanker and Receiver"
      workspaceTarget="both"
    />
  )
}
