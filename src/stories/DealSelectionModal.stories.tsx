import type { Meta, StoryObj } from '@storybook/react'
import DealSelectionModal from '../components/dealSelection/DealSelectionModal'

const meta: Meta<typeof DealSelectionModal> = {
  title: 'Modals/DealSelectionModal',
  component: DealSelectionModal,
}

export default meta
type Story = StoryObj<typeof DealSelectionModal>

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => alert('Закрыто'),
    onSelect: (type) => alert(`Выбрана: ${type === 'small' ? 'Мелкая сделка' : 'Крупная сделка'}`),
  },
}
