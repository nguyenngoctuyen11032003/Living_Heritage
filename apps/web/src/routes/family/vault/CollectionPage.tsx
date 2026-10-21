import { useParams } from 'react-router';
import { CollectionPage as Collection } from '@/features/vault/Collections';

export default function CollectionPage() {
  const { id = '' } = useParams();
  return <Collection key={id} collectionId={id} />;
}
