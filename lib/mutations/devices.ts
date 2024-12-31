'use server'


interface WhatsappInstanceData {
  instanceName: string
  number: string
  qrcode: boolean
  integration: 'WHATSAPP-BAILEYS' | 'WHATSAPP-BUSINESS'
  token?: string
  businessId?: string
}

export async function createWhatsappInstance(data: WhatsappInstanceData) {

}

export async function checkConnectionStatus(instanceName: string) {
  
}
