import { useTranslation } from 'react-i18next';

interface DuplicateNameModalProps {
  name: string;
  onCreateAnyway: () => void;
  onUpdate: () => void;
  onCancel: () => void;
}

export default function DuplicateNameModal({ name, onCreateAnyway, onUpdate, onCancel }: DuplicateNameModalProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-96 max-w-[90vw] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <i className="fa-solid fa-exclamation-triangle text-orange-500"></i>
          </div>
          <div>
            <h3 className="font-semibold">{t('duplicate.projectNameExists', { name })}</h3>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t('duplicate.projectNameExistsHint')}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {t('duplicate.cancel')}
          </button>
          <button
            onClick={onUpdate}
            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors"
          >
            {t('duplicate.updateExisting')}
          </button>
          <button
            onClick={onCreateAnyway}
            className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl transition-colors"
          >
            {t('duplicate.createAnyway')}
          </button>
        </div>
      </div>
    </div>
  );
}
