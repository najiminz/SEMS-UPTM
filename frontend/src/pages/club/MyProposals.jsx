import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useMyProposals } from '../../hooks/useMyProposals';
import DashboardLayout from '../../components/layout/DashboardLayout';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import Card from '../../components/ui/Card';
import ProposalsTable from '../../components/proposal/ProposalsTable';

export default function MyProposals() {
  const { proposals, loading, error, reload } = useMyProposals();

  return (
    <DashboardLayout>
      <PageHeader
        title="Club Proposals"
        subtitle="Every proposal your club has created, from first draft to final decision."
        actions={
          <Link to="/club/new">
            <Button size="lg"><Plus className="w-4 h-4" /> Create Proposal</Button>
          </Link>
        }
      />
      {error && <Alert variant="error" className="mb-6">{error}</Alert>}
      <Card padded={false} className="pt-4 sm:pt-6">
        <ProposalsTable proposals={proposals} loading={loading} pageSize={10} onChanged={reload} />
      </Card>
    </DashboardLayout>
  );
}
