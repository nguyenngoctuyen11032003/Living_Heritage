import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders one h1 with eyebrow, lede, meta, back link and actions', () => {
    render(
      <MemoryRouter>
        <PageHeader back={{ to: '/gia-dinh', label: 'Kho gia đình' }} eyebrow="Gia đình" title="Sách ký ức" lede="Gom câu chuyện." meta="3 cuốn" actions={<button type="button">Tạo sách</button>} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Sách ký ức');
    expect(screen.getByRole('link', { name: 'Kho gia đình' })).toHaveAttribute('href', '/gia-dinh');
    expect(screen.getByText('Gom câu chuyện.')).toBeInTheDocument();
    expect(screen.getByText('3 cuốn')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tạo sách' })).toBeInTheDocument();
  });

  it('accepts `description` as an alias of `lede`', () => {
    render(
      <MemoryRouter>
        <PageHeader title="Thành viên" description="Mời người thân." />
      </MemoryRouter>,
    );
    expect(screen.getByText('Mời người thân.')).toBeInTheDocument();
  });
});
