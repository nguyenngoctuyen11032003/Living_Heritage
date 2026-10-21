import { useParams } from 'react-router';
import { StoryDetail } from '@/features/vault/StoryDetail';

export default function StoryDetailPage() {
  const { id = '' } = useParams();
  return <StoryDetail key={id} storyId={id} />;
}
