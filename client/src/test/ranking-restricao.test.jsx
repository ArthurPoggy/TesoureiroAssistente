import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DelinquencyRanking } from '../components/analytics/DelinquencyRanking';

// O gate de visibilidade do ranking vive em App.jsx: `{isAdmin && <DelinquencyRanking/>}`,
// e `isAdmin` no AuthContext é `role === 'admin' || role === 'diretor_financeiro'`.
// Aqui validamos o contrato do componente que só é renderizado para o tesoureiro.

describe('DelinquencyRanking — painel restrito ao tesoureiro', () => {
  it('renderiza o painel de inadimplência e ranking com os dados', () => {
    const delinquent = [{ name: 'Devedor 1' }];
    const ranking = [{ name: 'Pontual 1', payments: 5 }];
    const { getByText } = render(<DelinquencyRanking delinquent={delinquent} ranking={ranking} />);

    expect(getByText('Inadimplência e ranking')).toBeInTheDocument();
    expect(getByText('Devedor 1')).toBeInTheDocument();
    expect(getByText('Pontual 1')).toBeInTheDocument();
    expect(getByText('5 pagamentos')).toBeInTheDocument();
  });

  it('mostra estados vazios quando não há dados', () => {
    const { getByText } = render(<DelinquencyRanking delinquent={[]} ranking={[]} />);
    expect(getByText('Todos pagaram!')).toBeInTheDocument();
    expect(getByText('Sem registros para este período.')).toBeInTheDocument();
  });
});
