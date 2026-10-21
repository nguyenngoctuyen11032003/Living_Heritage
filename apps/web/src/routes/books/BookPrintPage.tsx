import { useParams } from 'react-router';
import { BookPrint } from '@/features/books/BookPrint';

export default function BookPrintPage() {
  const { id = '' } = useParams();
  return <BookPrint key={id} bookId={id} />;
}
