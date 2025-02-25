'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Moon, Sun, ChevronsUpDown, Check, Palette, Globe } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const languages = [
  { label: 'English', value: 'en', flag: '🇬🇧' },
  { label: 'Français', value: 'fr', flag: '🇫🇷' },
  { label: 'العربية', value: 'ar', flag: '🇸🇦' },
]

export function AppearanceSettings() {
  const t = useTranslations('SettingsPage')
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const [openLanguagePopover, setOpenLanguagePopover] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0])
  const [currentTheme, setCurrentTheme] = useState('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setCurrentTheme(theme || 'system')
  }, [theme])

  const handleLanguageSelect = (language: typeof languages[0]) => {
    setSelectedLanguage(language)
    setOpenLanguagePopover(false)
    router.push(`/${language.value}/settings`)
  }

  if (!mounted) {
    return null
  }

  const themeOptions = [
    { value: 'light', label: t('light'), icon: Sun },
    { value: 'dark', label: t('dark'), icon: Moon },
    { value: 'system', label: t('system'), icon: () => <span className="text-lg">🖥️</span> },
  ]

  return (
    <div className="w-full space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">{t('appearance_settings')}</h2>
        <p className="text-muted-foreground">
          {t('appearance_description')}
        </p>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle>{t('theme')}</CardTitle>
          </div>
          <CardDescription>{t('theme_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-base mb-3 block">{t('color_scheme')}</Label>
            <RadioGroup 
              value={currentTheme} 
              className="grid grid-cols-3 gap-4"
              onValueChange={(value) => {
                setCurrentTheme(value)
                setTheme(value)
              }}
            >
              {themeOptions.map((option) => (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={option.value}
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    {(() => {
                      const Icon = option.icon;
                      return <Icon className="h-6 w-6 mb-2" />;
                    })()}
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="flex justify-between pt-5">
          <div className="text-sm text-muted-foreground">
            {t('current_theme')}: {themeOptions.find(t => t.value === currentTheme)?.label}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                {(() => {
                  const option = themeOptions.find(t => t.value === currentTheme);
                  if (option) {
                    const Icon = option.icon;
                    return <Icon className="h-4 w-4" />;
                  }
                  return null;
                })()}
                {themeOptions.find(t => t.value === currentTheme)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {themeOptions.map((option) => (
                <DropdownMenuItem 
                  key={option.value}
                  onClick={() => {
                    setCurrentTheme(option.value)
                    setTheme(option.value)
                  }} 
                  className="flex items-center gap-2"
                >
                  {(() => {
                    const Icon = option.icon;
                    return <Icon className="h-4 w-4" />;
                  })()}
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <CardTitle>{t('language')}</CardTitle>
          </div>
          <CardDescription>{t('language_description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="language" className="text-base mb-3 block">{t('select_language')}</Label>
            <Popover open={openLanguagePopover} onOpenChange={setOpenLanguagePopover}>
              <PopoverTrigger asChild>
                <Button
                  id="language"
                  variant="outline"
                  role="combobox"
                  aria-expanded={openLanguagePopover}
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{selectedLanguage.flag}</span>
                    {selectedLanguage.label}
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0">
                <Command>
                  <CommandInput placeholder={t('search_language')} />
                  <CommandEmpty>{t('no_language_found')}</CommandEmpty>
                  <CommandList>
                    <CommandGroup heading={t('available_languages')}>
                      {languages.map((language) => (
                        <CommandItem
                          key={language.value}
                          value={language.value}
                          onSelect={() => handleLanguageSelect(language)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{language.flag}</span>
                            {language.label}
                            {selectedLanguage.value === language.value && (
                              <Check className="ml-auto h-4 w-4" />
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">{t('language_preview')}</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('language_preview_text')}
            </p>
          </div>
        </CardContent>
        <Separator />
        <CardFooter className="flex justify-between pt-5">
          <div className="text-sm text-muted-foreground">
            {t('current_language')}: {selectedLanguage.label}
          </div>
          <Button 
            variant="default"
            size="sm"
            onClick={() => handleLanguageSelect(selectedLanguage)}
          >
            {t('apply_language')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
