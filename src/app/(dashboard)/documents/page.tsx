"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Upload, 
  Download, 
  Eye, 
  Trash2, 
  Search,
  Filter,
  Plus,
  File,
  Image,
  FileSpreadsheet,
  Calendar,
  User,
  X,
  CheckCircle,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { DocumentCategory } from "@/lib/supabase-storage"

interface Document {
  id: string
  leadId: string
  leadName: string
  fileName: string
  fileType: string
  fileSize: number
  category: string
  uploadedAt: string
  uploadedBy: string
  status: "PENDIENTE" | "APROBADO" | "RECHAZADO"
  url?: string
}

const DOCUMENT_CATEGORIES: Record<string, { label: string; icon: any; color: string }> = {
  dni: { label: "DNI", icon: User, color: "blue" },
  comprobantes: { label: "Comprobantes", icon: FileSpreadsheet, color: "green" },
  contratos: { label: "Contratos", icon: FileText, color: "purple" },
  recibos: { label: "Recibos", icon: FileText, color: "yellow" },
  otros: { label: "Otros", icon: File, color: "gray" },
  // Compatibilidad con valores antiguos
  DNI: { label: "DNI", icon: User, color: "blue" },
  COMPROBANTE_INGRESOS: { label: "Comprobante Ingresos", icon: FileSpreadsheet, color: "green" },
  RECIBO_SUELDO: { label: "Recibo de Sueldo", icon: FileText, color: "yellow" },
  OTROS: { label: "Otros", icon: File, color: "gray" }
}

const FILE_TYPE_ICONS = {
  "application/pdf": FileText,
  "image/jpeg": Image,
  "image/png": Image,
  "image/jpg": Image,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": FileSpreadsheet,
  "application/vnd.ms-excel": FileSpreadsheet,
  default: File
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  
  // Estados para drag & drop
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedLead, setSelectedLead] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>('otros')
  const [fileDescription, setFileDescription] = useState('')
  const [leads, setLeads] = useState<Array<{ id: string; nombre: string; telefono: string }>>([])
  const [loadingLeads, setLoadingLeads] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchDocuments()
  }, [categoryFilter])

  useEffect(() => {
    fetchLeads()
  }, [])

  const fetchLeads = async () => {
    try {
      setLoadingLeads(true)
      const response = await fetch('/api/leads?limit=100')
      if (response.ok) {
        const data = await response.json()
        setLeads(data.leads || [])
      }
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoadingLeads(false)
    }
  }

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams()
      if (categoryFilter) params.append('category', categoryFilter)
      
      const response = await fetch(`/api/documents?${params.toString()}`)
      
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      } else {
        console.error('Error fetching documents')
        setDocuments([])
      }
    } catch (error) {
      console.error("Error fetching documents:", error)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  // Handlers para drag & drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelected(files[0])
    }
  }

  const handleFileSelected = (file: File) => {
    // Validar tamaño del archivo antes de mostrar el diálogo
    const MAX_SIZE = 4.5 * 1024 * 1024 // 4.5MB (límite de Vercel)
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2)
    
    if (file.size > MAX_SIZE) {
      setUploadError(`El archivo es demasiado grande (${fileSizeMB}MB). El límite máximo es 4.5MB. Por favor, comprime el archivo o usa un archivo más pequeño.`)
      setSelectedFile(null)
      return
    }
    
    setSelectedFile(file)
    setShowUploadDialog(true)
    setUploadError(null)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelected(files[0])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !selectedLead) {
      setUploadError('Selecciona un lead y un archivo')
      return
    }

    try {
      setUploading(true)
      setUploadProgress(0)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('leadId', selectedLead)
      formData.append('category', selectedCategory)
      if (fileDescription) formData.append('description', fileDescription)

      // Simular progreso
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const data = await response.json()
        console.log('File uploaded successfully:', data)
        
        // Actualizar lista de documentos
        await fetchDocuments()
        
        // Resetear formulario
        setShowUploadDialog(false)
        setSelectedFile(null)
        setSelectedLead('')
        setSelectedCategory('otros')
        setFileDescription('')
        setUploadError(null)
      } else {
        const errorData = await response.json().catch(() => ({ 
          message: 'Error desconocido al subir el archivo',
          error: 'Unknown error'
        }))
        
        console.error('Upload error:', {
          status: response.status,
          error: errorData.error,
          message: errorData.message
        })
        
        // Manejar diferentes tipos de errores
        if (response.status === 413) {
          const fileSizeMB = selectedFile ? (selectedFile.size / 1024 / 1024).toFixed(2) : '0'
          setUploadError(
            errorData.message || 
            `El archivo es demasiado grande (${fileSizeMB}MB). El límite máximo es 4.5MB para subida directa. Por favor, comprime el archivo o usa un archivo más pequeño.`
          )
        } else if (response.status === 403) {
          setUploadError(errorData.message || 'No tienes permisos para subir documentos. Por favor, contacta al administrador.')
        } else if (response.status === 400) {
          setUploadError(errorData.message || 'Datos inválidos. Por favor, verifica que hayas seleccionado un lead y una categoría válida.')
        } else if (response.status === 500) {
          setUploadError(errorData.message || 'Error del servidor al subir el archivo. Por favor, intenta nuevamente o contacta al administrador.')
        } else {
          setUploadError(errorData.message || 'Error al subir el archivo. Por favor, intenta nuevamente.')
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      setUploadError('Error de conexión al subir el archivo. Por favor, verifica tu conexión a internet e intenta nuevamente.')
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar este documento?')) {
      return
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Actualizar lista
        await fetchDocuments()
      } else {
        console.error('Error deleting document')
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.leadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.fileName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || doc.category === categoryFilter
    const matchesStatus = !statusFilter || doc.status === statusFilter
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString))
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDIENTE: "formosa-badge-pendiente",
      APROBADO: "formosa-badge-preaprobado", 
      RECHAZADO: "formosa-badge-rechazado"
    }
    return variants[status as keyof typeof variants] || "formosa-badge-revision"
  }

  const getFileIcon = (fileType: string) => {
    const IconComponent = FILE_TYPE_ICONS[fileType as keyof typeof FILE_TYPE_ICONS] || FILE_TYPE_ICONS.default
    return IconComponent
  }

  const getCategoryInfo = (category: string) => {
    const normalizedCategory = category.toLowerCase()
    return DOCUMENT_CATEGORIES[normalizedCategory] || DOCUMENT_CATEGORIES[category] || DOCUMENT_CATEGORIES.otros
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="space-y-8 p-6">
          <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="formosa-card animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-gray-100 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold gradient-text" data-testid="documents-title">Documentos</h1>
            <p className="text-muted-foreground mt-2">
              Gestión de documentos de leads de Formosa
            </p>
          </div>
          <Button 
            className="gradient-primary text-white hover-lift" 
            data-testid="upload-button"
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Subir Documento
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileInputChange}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
          />
        </div>

        {/* Zona de Drag & Drop */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-12 text-center transition-all",
            isDragging 
              ? "border-purple-500 bg-purple-50" 
              : "border-gray-300 bg-white hover:border-purple-400"
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <Upload className={cn(
            "h-12 w-12 mx-auto mb-4",
            isDragging ? "text-purple-500" : "text-gray-400"
          )} />
          <p className="text-lg font-medium mb-2">
            {isDragging ? "Suelta el archivo aquí" : "Arrastra un archivo o haz click para seleccionar"}
          </p>
          <p className="text-sm text-gray-500">
            PDF, JPG, PNG, DOC, XLS hasta 100MB
          </p>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <Card className="formosa-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{documents.length}</p>
                  <p className="text-sm text-muted-foreground">Total Documentos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="formosa-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {documents.filter(d => d.status === "PENDIENTE").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Pendientes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="formosa-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                  <Eye className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {documents.filter(d => d.status === "APROBADO").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Aprobados</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="formosa-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-200 rounded-lg flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {documents.filter(d => d.status === "RECHAZADO").length}
                  </p>
                  <p className="text-sm text-muted-foreground">Rechazados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="formosa-card">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todas las categorías</option>
                {Object.entries(DOCUMENT_CATEGORIES).map(([key, category]) => (
                  <option key={key} value={key}>
                    {category.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Todos los estados</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="APROBADO">Aprobado</option>
                <option value="RECHAZADO">Rechazado</option>
              </select>

              <div className="flex items-center space-x-2">
                <Badge variant="outline">
                  {filteredDocuments.length} documentos
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista de documentos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="documents-grid">
          {filteredDocuments.map((doc, index) => {
            const categoryInfo = getCategoryInfo(doc.category)
            const FileIcon = getFileIcon(doc.fileType)
            
            return (
              <Card 
                key={doc.id} 
                className="formosa-card hover-lift animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={cn("text-xs", getStatusBadge(doc.status))}>
                      {doc.status}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        title="Ver documento"
                        onClick={() => doc.url && window.open(doc.url, '_blank')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        title="Descargar"
                        onClick={() => doc.url && window.open(doc.url, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        title="Eliminar"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Icono y tipo de archivo */}
                  <div className="flex items-center justify-center">
                    <div className={cn(
                      "w-16 h-16 rounded-lg flex items-center justify-center",
                      `bg-gradient-to-br from-${categoryInfo.color}-100 to-${categoryInfo.color}-200`
                    )}>
                      <FileIcon className={cn("h-8 w-8", `text-${categoryInfo.color}-600`)} />
                    </div>
                  </div>

                  {/* Información del documento */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm truncate" title={doc.fileName}>
                      {doc.fileName}
                    </h3>
                    
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p><strong>Lead:</strong> {doc.leadName}</p>
                      <p><strong>Categoría:</strong> {categoryInfo.label}</p>
                      <p><strong>Tamaño:</strong> {formatFileSize(doc.fileSize)}</p>
                      <p><strong>Subido:</strong> {formatDate(doc.uploadedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filteredDocuments.length === 0 && (
          <Card className="formosa-card">
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">
                No se encontraron documentos
              </h3>
              <p className="text-gray-500 mb-4">
                No hay documentos que coincidan con los filtros aplicados
              </p>
              <Button 
                className="gradient-primary text-white"
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Subir primer documento
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Upload */}
      {showUploadDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Subir Documento</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowUploadDialog(false)}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Selecciona el lead y categoría del documento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Archivo seleccionado */}
              {selectedFile && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <File className="h-8 w-8 text-purple-600" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              )}

              {/* Selector de Lead */}
              <div>
                <label className="text-sm font-medium mb-2 block">Lead</label>
                <select
                  value={selectedLead}
                  onChange={(e) => setSelectedLead(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={uploading || loadingLeads}
                >
                  <option value="">Selecciona un lead</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.nombre} - {lead.telefono}
                    </option>
                  ))}
                </select>
                {loadingLeads && (
                  <p className="text-xs text-gray-500 mt-1">Cargando leads...</p>
                )}
              </div>

              {/* Selector de Categoría */}
              <div>
                <label className="text-sm font-medium mb-2 block">Categoría</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  disabled={uploading}
                >
                  <option value="dni">DNI</option>
                  <option value="comprobantes">Comprobantes</option>
                  <option value="contratos">Contratos</option>
                  <option value="recibos">Recibos</option>
                  <option value="otros">Otros</option>
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-sm font-medium mb-2 block">Descripción (opcional)</label>
                <Input
                  type="text"
                  placeholder="Descripción del documento"
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  disabled={uploading}
                />
              </div>

              {/* Barra de progreso */}
              {uploading && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-center text-gray-600">
                    Subiendo... {uploadProgress}%
                  </p>
                </div>
              )}

              {/* Error */}
              {uploadError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <p className="text-sm text-red-600">{uploadError}</p>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setShowUploadDialog(false)}
                  disabled={uploading}
                >
                  Cancelar
                </Button>
                <Button 
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile || !selectedLead}
                >
                  {uploading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Subir
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
