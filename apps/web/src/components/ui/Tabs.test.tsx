import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tab, TabList, TabPanel, Tabs } from './Tabs';

function Harness() {
  return (
    <Tabs defaultValue="a">
      <TabList label="Outputs">
        <Tab value="a">Alpha</Tab>
        <Tab value="b">Beta</Tab>
        <Tab value="c">Gamma</Tab>
      </TabList>
      <TabPanel value="a">Panel A</TabPanel>
      <TabPanel value="b">Panel B</TabPanel>
      <TabPanel value="c">Panel C</TabPanel>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('wires roles, aria-selected, aria-controls and roving tabindex', () => {
    render(<Harness />);
    const list = screen.getByRole('tablist', { name: 'Outputs' });
    expect(list).toBeInTheDocument();
    const [a, b] = screen.getAllByRole('tab');
    expect(a).toHaveAttribute('aria-selected', 'true');
    expect(a).toHaveAttribute('tabindex', '0');
    expect(b).toHaveAttribute('tabindex', '-1');
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveTextContent('Panel A');
    expect(a).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', a!.id);
  });

  it('moves and selects with arrow keys (wrapping), Home and End', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const tab = (name: string) => screen.getByRole('tab', { name });
    await user.click(tab('Alpha'));
    await user.keyboard('{ArrowRight}');
    expect(tab('Beta')).toHaveFocus();
    expect(tab('Beta')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel B');

    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(tab('Alpha')).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(tab('Gamma')).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Panel C');

    await user.keyboard('{Home}');
    expect(tab('Alpha')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}');
    expect(tab('Gamma')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Gamma')).toHaveAttribute('tabindex', '0');
    expect(tab('Alpha')).toHaveAttribute('tabindex', '-1');
  });
});
