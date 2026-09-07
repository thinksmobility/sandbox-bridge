export interface ExampleItem {
  id: string
  title: string
  subtitle: string
}

const SEED_ITEMS: readonly ExampleItem[] = [
  { id: 'item-1', title: 'Örnek kayıt 1', subtitle: 'Alt başlık 1' },
  { id: 'item-2', title: 'Örnek kayıt 2', subtitle: 'Alt başlık 2' },
  { id: 'item-3', title: 'Örnek kayıt 3', subtitle: 'Alt başlık 3' }
]

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Seed verisi üstünde yapay gecikmeli mock adapter — gerçek bir servis
 * katmanının yerini tutar. Demo repoları bu dosyayı kendi seed'leriyle
 * (`seed/*.json`) değiştirir.
 */
export async function fetchExampleItems(): Promise<ExampleItem[]> {
  await delay(150)
  return [...SEED_ITEMS]
}
