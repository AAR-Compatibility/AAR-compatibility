import SRDHolderFormWorkspace from './SRD_holderFormWorkspace'

type TankersPageProps = {
  onLogout: () => void
  onOpenViewer: () => void
  onOpenMySrd: () => void
}

export default function TankersPage(props: TankersPageProps) {
  return <SRDHolderFormWorkspace {...props} pageTitle="Tankers" workspaceTarget="tanker" />
}
