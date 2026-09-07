import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { SandboxSelectable } from '@tmob/sandbox-bridge/react'
import { fetchExampleItems, type ExampleItem } from '../src/mock/apiAdapter'

export default function ExampleScreen(): React.JSX.Element {
  const [items, setItems] = useState<ExampleItem[]>([])

  useEffect(() => {
    let cancelled = false
    fetchExampleItems().then((result) => {
      if (!cancelled) setItems(result)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <View className="flex-1 bg-white px-4 pt-16">
      <Text className="text-2xl font-semibold text-slate-900">Örnek Ekran</Text>
      <Text className="mt-1 text-sm text-slate-500">sandbox-expo-kit başlangıç şablonu</Text>

      <SandboxSelectable screenId="scr-example-list" componentId="cmp-example-card" label="Örnek liste kartı">
        <View className="mt-6 rounded-2xl border border-slate-200 p-4">
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="border-b border-slate-100 py-2 last:border-b-0">
                <Text className="text-base text-slate-800">{item.title}</Text>
                <Text className="text-xs text-slate-400">{item.subtitle}</Text>
              </View>
            )}
          />
        </View>
      </SandboxSelectable>

      <Link href="/harita" asChild>
        <Pressable className="mt-6 self-start rounded-full bg-slate-900 px-4 py-2">
          <Text className="text-sm font-medium text-white">Haritayı gör</Text>
        </Pressable>
      </Link>
    </View>
  )
}
