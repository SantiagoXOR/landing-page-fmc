/**
 * Supabase Storage Service
 * Servicio para gestionar archivos y documentos en Supabase Storage
 */

import { supabase } from './db'

export type DocumentCategory = 'dni' | 'comprobantes' | 'contratos' | 'recibos' | 'otros'

export interface UploadFileParams {
  file: File
  leadId: string
  category: DocumentCategory
  description?: string
}

export interface DocumentMetadata {
  id: string
  lead_id: string
  filename: string
  original_filename: string
  category: DocumentCategory
  file_size: number
  mime_type: string
  storage_path: string
  public_url?: string
  description?: string
  uploaded_by: string
  created_at: string
}

export class SupabaseStorageService {
  private static readonly BUCKET_NAME = 'documents'
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  /**
   * Inicializar bucket si no existe
   */
  static async initializeBucket() {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const { data: buckets, error } = await supabase.client.storage.listBuckets()
      
      if (error) throw error

      const bucketExists = buckets.some(b => b.name === this.BUCKET_NAME)

      if (!bucketExists) {
        const { data, error: createError } = await supabase.client.storage.createBucket(this.BUCKET_NAME, {
          public: false,
          fileSizeLimit: this.MAX_FILE_SIZE,
          allowedMimeTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          ]
        })

        if (createError) throw createError

        console.log('[Storage] Bucket created successfully:', this.BUCKET_NAME)
        return true
      }

      console.log('[Storage] Bucket already exists:', this.BUCKET_NAME)
      return true
    } catch (error) {
      console.error('[Storage] Error initializing bucket:', error)
      throw error
    }
  }

  /**
   * Subir archivo a Supabase Storage
   */
  static async uploadFile(params: UploadFileParams, userId: string): Promise<DocumentMetadata> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      // Validar tamaño del archivo
      if (params.file.size > this.MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed (${this.MAX_FILE_SIZE / 1024 / 1024}MB)`)
      }

      // Generar nombre único para el archivo
      const fileExt = params.file.name.split('.').pop()
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(7)
      const filename = `${params.leadId}/${params.category}/${timestamp}-${randomStr}.${fileExt}`

      // Subir archivo a Storage
      const { data, error } = await supabase.client.storage
        .from(this.BUCKET_NAME)
        .upload(filename, params.file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) throw error

      console.log('[Storage] File uploaded successfully:', filename)

      // Obtener URL pública firmada (válida por 1 año)
      const { data: urlData } = await supabase.client.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(filename, 365 * 24 * 60 * 60) // 1 año

      // Guardar metadata en la base de datos
      const metadata: Omit<DocumentMetadata, 'id' | 'created_at'> = {
        lead_id: params.leadId,
        filename: filename,
        original_filename: params.file.name,
        category: params.category,
        file_size: params.file.size,
        mime_type: params.file.type,
        storage_path: data.path,
        public_url: urlData?.signedUrl,
        description: params.description,
        uploaded_by: userId,
      }

      const { data: docData, error: dbError } = await supabase.client
        .from('documents')
        .insert(metadata)
        .select()
        .single()

      if (dbError) {
        // Si falla guardar en DB, eliminar archivo de Storage
        await this.deleteFile(filename)
        throw dbError
      }

      return docData
    } catch (error) {
      console.error('[Storage] Error uploading file:', error)
      throw error
    }
  }

  /**
   * Obtener documentos de un lead
   */
  static async getLeadDocuments(leadId: string): Promise<DocumentMetadata[]> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const { data, error } = await supabase.client
        .from('documents')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('[Storage] Error fetching lead documents:', error)
      throw error
    }
  }

  /**
   * Obtener documento por ID
   */
  static async getDocument(documentId: string): Promise<DocumentMetadata | null> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const { data, error } = await supabase.client
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error) {
      console.error('[Storage] Error fetching document:', error)
      throw error
    }
  }

  /**
   * Eliminar archivo de Storage y metadata
   */
  static async deleteDocument(documentId: string): Promise<boolean> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      // Obtener metadata
      const document = await this.getDocument(documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      // Eliminar archivo de Storage
      const { error: storageError } = await supabase.client.storage
        .from(this.BUCKET_NAME)
        .remove([document.storage_path])

      if (storageError) {
        console.error('[Storage] Error deleting file from storage:', storageError)
      }

      // Eliminar metadata de la base de datos
      const { error: dbError } = await supabase.client
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (dbError) throw dbError

      console.log('[Storage] Document deleted successfully:', documentId)
      return true
    } catch (error) {
      console.error('[Storage] Error deleting document:', error)
      throw error
    }
  }

  /**
   * Eliminar archivo solo de Storage (helper privado)
   */
  private static async deleteFile(path: string): Promise<void> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      await supabase.client.storage
        .from(this.BUCKET_NAME)
        .remove([path])
    } catch (error) {
      console.error('[Storage] Error deleting file:', error)
    }
  }

  /**
   * Obtener URL firmada de descarga
   */
  static async getSignedUrl(storagePath: string, expiresIn: number = 3600): Promise<string | null> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const { data, error } = await supabase.client.storage
        .from(this.BUCKET_NAME)
        .createSignedUrl(storagePath, expiresIn)

      if (error) throw error

      return data.signedUrl
    } catch (error) {
      console.error('[Storage] Error creating signed URL:', error)
      return null
    }
  }

  /**
   * Actualizar metadata de documento
   */
  static async updateDocumentMetadata(
    documentId: string,
    updates: Partial<Pick<DocumentMetadata, 'description' | 'category'>>
  ): Promise<DocumentMetadata> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const { data, error } = await supabase.client
        .from('documents')
        .update(updates)
        .eq('id', documentId)
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('[Storage] Error updating document metadata:', error)
      throw error
    }
  }

  /**
   * Buscar documentos con filtros
   */
  static async searchDocuments(filters: {
    leadId?: string
    category?: DocumentCategory
    search?: string
    uploadedBy?: string
    page?: number
    limit?: number
  }): Promise<{ data: DocumentMetadata[]; total: number }> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      const page = filters.page || 1
      const limit = filters.limit || 50
      const offset = (page - 1) * limit

      let query = supabase.client
        .from('documents')
        .select('*', { count: 'exact' })

      if (filters.leadId) {
        query = query.eq('lead_id', filters.leadId)
      }

      if (filters.category) {
        query = query.eq('category', filters.category)
      }

      if (filters.uploadedBy) {
        query = query.eq('uploaded_by', filters.uploadedBy)
      }

      if (filters.search) {
        query = query.or(`original_filename.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      return {
        data: data || [],
        total: count || 0
      }
    } catch (error) {
      console.error('[Storage] Error searching documents:', error)
      throw error
    }
  }

  /**
   * Obtener estadísticas de almacenamiento
   */
  static async getStorageStats(leadId?: string): Promise<{
    totalFiles: number
    totalSize: number
    byCategory: Record<DocumentCategory, number>
  }> {
    try {
      if (!supabase.client) {
        throw new Error('Database connection error')
      }

      let query = supabase.client
        .from('documents')
        .select('category, file_size')

      if (leadId) {
        query = query.eq('lead_id', leadId)
      }

      const { data, error } = await query

      if (error) throw error

      const stats = {
        totalFiles: data?.length || 0,
        totalSize: data?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0,
        byCategory: {
          dni: 0,
          comprobantes: 0,
          contratos: 0,
          recibos: 0,
          otros: 0,
        } as Record<DocumentCategory, number>
      }

      data?.forEach(doc => {
        if (doc.category) {
          stats.byCategory[doc.category as DocumentCategory]++
        }
      })

      return stats
    } catch (error) {
      console.error('[Storage] Error getting storage stats:', error)
      throw error
    }
  }
}

