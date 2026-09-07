import { fetchExampleItems } from '../src/mock/apiAdapter'

describe('fetchExampleItems', () => {
  it('seed verisi üstünden örnek kayıtları döner', async () => {
    const items = await fetchExampleItems()
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]).toMatchObject({ id: expect.any(String), title: expect.any(String) })
  })

  it('her çağrıda yeni bir dizi döner (mutasyon yok)', async () => {
    const first = await fetchExampleItems()
    const second = await fetchExampleItems()
    expect(first).not.toBe(second)
    expect(first).toEqual(second)
  })
})
