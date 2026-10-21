import { useParams } from 'react-router';
import { BookBuilder } from '@/features/books/BookBuilder';

export default function BookBuilderPage() {
  const { id = '' } = useParams();
  return <BookBuilder key={id} bookId={id} />;
}
