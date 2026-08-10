import { useState } from 'react';
import { formatCurrency } from '../../utils/formatters';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];

function isImageFile(name) {
  if (!name) return false;
  const ext = name.split('.').pop().toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function formatExpenseDate(dateStr) {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function ExpenseAttachment({ attachmentName, attachmentUrl, onPreview }) {
  if (!attachmentUrl) return <p className="expense-detail-hint">Nenhum comprovante anexado.</p>;

  return (
    <div className="expense-detail-attachment">
      {isImageFile(attachmentName) ? (
        <img
          src={attachmentUrl}
          alt={attachmentName || 'Comprovante'}
          onClick={() => onPreview(attachmentUrl)}
        />
      ) : (
        <a href={attachmentUrl} target="_blank" rel="noreferrer">
          Baixar {attachmentName || 'comprovante'}
        </a>
      )}
    </div>
  );
}

export function ExpenseDetailView({ expense }) {
  const [lightboxUrl, setLightboxUrl] = useState(null);

  if (!expense) return null;

  return (
    <div className="expense-detail-panel">
      <div className="expense-detail-header">
        <h3>{expense.title}</h3>
        <span className="expense-detail-amount">{formatCurrency(expense.amount)}</span>
      </div>

      <div className="expense-detail-sections">
        <section className="expense-detail-section">
          <h4>Dados da Despesa</h4>
          <dl className="expense-detail-grid">
            <dt>Data</dt>
            <dd>{formatExpenseDate(expense.expense_date)}</dd>
            <dt>Categoria</dt>
            <dd>{expense.category || '-'}</dd>
            <dt>Evento vinculado</dt>
            <dd>{expense.event_name || 'Nenhum'}</dd>
            <dt>Observações</dt>
            <dd>{expense.notes || '-'}</dd>
          </dl>
        </section>

        <section className="expense-detail-section">
          <h4>Tags</h4>
          {expense.tags && expense.tags.length > 0 ? (
            <div className="tag-pills">
              {expense.tags.map((tag) => (
                <span key={tag.id} className="tag-pill">
                  {tag.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="expense-detail-hint">Nenhuma tag associada.</p>
          )}
        </section>

        <section className="expense-detail-section">
          <h4>Comprovante</h4>
          <ExpenseAttachment
            attachmentName={expense.attachment_name}
            attachmentUrl={expense.attachment_url}
            onPreview={setLightboxUrl}
          />
        </section>
      </div>

      {lightboxUrl && (
        <div className="history-lightbox" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Comprovante" />
        </div>
      )}
    </div>
  );
}
