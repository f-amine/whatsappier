import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardHeader} from "@/components/ui/card"
import { CreditCard, Palette } from "lucide-react"
import { Subscriptions } from "@/components/pages/settings/SubscriptionsPage"
import { Skeleton } from "@/components/ui/skeleton"
import { AppearanceSettings } from "@/components/pages/settings/AppearanceSettings"

export default async function SettingsPage({
  params
}: {
  params: { locale: string }
}) {
  const t = await getTranslations('SettingsPage')

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">{t('settings')}</h1>
      
      <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            {t('appearance')}
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {t('billing')}
          </TabsTrigger>
        </TabsList>
        
        {/* Appearance Tab */}
        <TabsContent value="appearance">
          <Suspense fallback={<SettingsSkeleton />}>
            <AppearanceSettings />
          </Suspense>
        </TabsContent>
        
        {/* Billing Tab */}
        <TabsContent value="billing">
          <Suspense fallback={<SettingsSkeleton />}>
            <Subscriptions />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-2/4 mt-2" />
        </CardHeader>
        <div className="p-6">
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-4 w-2/4 mt-2" />
        </CardHeader>
        <div className="p-6">
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    </div>
  )
}
