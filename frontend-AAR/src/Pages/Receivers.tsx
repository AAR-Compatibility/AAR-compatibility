import SRDHolderFormWorkspace from './SRD_holderFormWorkspace'

type ReceiversPageProps = {
  onLogout: () => void
  onOpenViewer: () => void
  onOpenMySrd: () => void
}

export default function ReceiversPage(props: ReceiversPageProps) {
  return <SRDHolderFormWorkspace {...props} pageTitle="Receivers" workspaceTarget="receiver" />
}
