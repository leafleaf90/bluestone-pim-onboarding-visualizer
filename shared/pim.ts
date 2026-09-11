export const PIM_DATA_TYPES = [
  'text',
  'multiline',
  'formatted_text',
  'boolean',
  'integer',
  'decimal',
  'date',
  'single_select',
  'multi_select',
  'dictionary',
  'matrix'
] as const

export type PimDataType = (typeof PIM_DATA_TYPES)[number]

export const PIM_PRODUCT_TYPES = ['FAMILY', 'GROUP', 'VARIANT', 'SINGLE', 'BUNDLE'] as const
export type PimProductType = (typeof PIM_PRODUCT_TYPES)[number]

export function pimDataTypeLabel(value: PimDataType) {
  const labels: Record<PimDataType, string> = {
    text: 'Text',
    multiline: 'Multiline',
    formatted_text: 'Formatted text',
    boolean: 'Boolean',
    integer: 'Integer',
    decimal: 'Decimal',
    date: 'Date',
    single_select: 'Single select',
    multi_select: 'Multi select',
    dictionary: 'Dictionary',
    matrix: 'Matrix'
  }
  return labels[value]
}
