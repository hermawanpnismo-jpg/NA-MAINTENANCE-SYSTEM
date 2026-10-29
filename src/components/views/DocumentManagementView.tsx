import React, { useEffect, useState, useRef } from 'react';
import {
  FileText, Plus, Search, Filter, Download, ExternalLink, Trash2, FolderPlus,
  RefreshCw, Folder, File, FileSpreadsheet, Image as ImageIcon,
  CheckCircle2, AlertTriangle, X, Save, Cloud, LogOut
} from 'lucide-react';
import { DocumentItem, Asset, Plant } from '../../types/index.ts';
import { api } from '../../lib/api.ts';
import { formatDate } from '../../lib/formatters.ts';
import {
  googleSignIn,
  googleLogout,
  getAccessToken,
  initAuth,
  listDriveFiles,
  uploadFileToDrive,
  createDriveFolder,
  deleteDriveFile,
  GoogleDriveFile
} from '../../lib/googleDrive.ts';
import { User } from 'firebase/auth';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal.tsx';

interface DocumentManagementViewProps {
  selectedPlant: string;
  plants: Plant[];
}

export const DocumentManagementView: React.FC<DocumentManagementViewProps> = ({
  selectedPlant,
  plants
}) => {
  // Local Database Documents State
  const [activeTab, setActiveTab] = useState<'drive' | 'local'>('drive');
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDoc, setNewDoc] = useState({
    title: '',
    category: 'Equipment Manual',
    asset_id: '',
    plant_id: selectedPlant === 'all' ? (plants[0]?.id || '') : selectedPlant,
    file_name: 'Manual_Schematic.pdf',
    file_size: '3.4 MB',
    tags: 'Manual, Technical, SOP'
  });

  // Google Drive State
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isDriveAuthenticated, setIsDriveAuthenticated] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
  const [loadingDrive, setLoadingDrive] = useState(false);
  const [driveSearch, setDriveSearch] = useState('');
  const [driveTypeFilter, setDriveTypeFilter] = useState('all');
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [folderBreadcrumb, setFolderBreadcrumb] = useState<{ id?: string; name: string }[]>([
    { name: 'My Drive' }
  ]);

  // Upload to Drive
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingToDrive, setUploadingToDrive] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Delete Confirmation Modal (Required for Destructive Workspace Operations)
  const [fileToDelete, setFileToDelete] = useState<GoogleDriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Local Document Delete State
  const [localDocToDelete, setLocalDocToDelete] = useState<DocumentItem | null>(null);
  const [isDeletingLocal, setIsDeletingLocal] = useState(false);

  const handleDeleteLocalDoc = async () => {
    if (!localDocToDelete) return;
    try {
      setIsDeletingLocal(true);
      await api.deleteDocument(localDocToDelete.id, 'Document Controller');
      setLocalDocToDelete(null);
      loadLocalDocs();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus dokumen teknis');
    } finally {
      setIsDeletingLocal(false);
    }
  };

  // Load Local Documents
  const loadLocalDocs = async () => {
    try {
      setLoadingLocal(true);
      const [docList, assetList] = await Promise.all([
        api.getDocuments(),
        api.getAssets({ plant: selectedPlant })
      ]);
      setDocuments(docList);
      setAssets(assetList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLocal(false);
    }
  };

  // Load Google Drive Files
  const loadDriveFiles = async (folderId?: string) => {
    try {
      setLoadingDrive(true);
      const files = await listDriveFiles({
        folderId,
        searchQuery: driveSearch,
        mimeTypeFilter: driveTypeFilter
      });
      setDriveFiles(files);
    } catch (err: any) {
      console.error('Failed to load Drive files:', err);
      if (err.message?.includes('Not authenticated')) {
        setIsDriveAuthenticated(false);
      }
    } finally {
      setLoadingDrive(false);
    }
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setIsDriveAuthenticated(true);
        loadDriveFiles(currentFolderId);
      },
      () => {
        setGoogleUser(null);
        setIsDriveAuthenticated(false);
      }
    );
    return () => unsubscribe();
  }, [currentFolderId]);

  useEffect(() => {
    loadLocalDocs();
  }, [selectedPlant]);

  useEffect(() => {
    if (isDriveAuthenticated) {
      loadDriveFiles(currentFolderId);
    }
  }, [driveTypeFilter, currentFolderId]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setIsDriveAuthenticated(true);
        loadDriveFiles(currentFolderId);
      }
    } catch (err: any) {
      alert(`Google Sign-In failed: ${err.message || 'Please check popup settings.'}`);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await googleLogout();
    setGoogleUser(null);
    setIsDriveAuthenticated(false);
    setDriveFiles([]);
  };

  const handleFolderClick = (folder: GoogleDriveFile) => {
    setCurrentFolderId(folder.id);
    setFolderBreadcrumb((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    const target = folderBreadcrumb[index];
    setFolderBreadcrumb(folderBreadcrumb.slice(0, index + 1));
    setCurrentFolderId(target.id);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingToDrive(true);
      await uploadFileToDrive(file, currentFolderId);
      loadDriveFiles(currentFolderId);
    } catch (err: any) {
      alert(`Failed to upload to Google Drive: ${err.message}`);
    } finally {
      setUploadingToDrive(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      await createDriveFolder(newFolderName.trim(), currentFolderId);
      setShowNewFolderModal(false);
      setNewFolderName('');
      loadDriveFiles(currentFolderId);
    } catch (err: any) {
      alert(`Failed to create folder: ${err.message}`);
    }
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    try {
      setIsDeleting(true);
      await deleteDriveFile(fileToDelete.id, fileToDelete.name);
      setFileToDelete(null);
      loadDriveFiles(currentFolderId);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateLocalDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDocument({
        ...newDoc,
        user_name: 'Warto'
      });
      setShowAddDocModal(false);
      loadLocalDocs();
    } catch (err: any) {
      alert(err.message || 'Failed to upload document');
    }
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '-';
    const b = parseInt(bytes, 10);
    if (isNaN(b)) return bytes;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-4 h-4 text-amber-500 shrink-0" />;
    }
    if (mimeType.includes('spreadsheet') || mimeType.includes('sheet') || mimeType.includes('csv')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    if (mimeType.includes('image')) {
      return <ImageIcon className="w-4 h-4 text-blue-500 shrink-0" />;
    }
    return <FileText className="w-4 h-4 text-slate-500 shrink-0" />;
  };

  const localCategories = [
    'Equipment Manual',
    'Electrical Drawing',
    'SOP',
    'HIRADC / Risk Assessment',
    'Work Permit (PTW)',
    'Service Report'
  ];

  const filteredLocal = documents.filter((d) => {
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-700" />
            Engineering Document Center &amp; Cloud Drive
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access, upload, and organize maintenance files, CAD drawings, OEM manuals, and SOPs directly via Google Drive.
          </p>
        </div>

        {/* Tab Switcher & Drive Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setActiveTab('drive')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all ${
                activeTab === 'drive'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Cloud className="w-3.5 h-3.5" />
              Google Drive
            </button>
            <button
              onClick={() => setActiveTab('local')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md transition-all ${
                activeTab === 'local'
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <File className="w-3.5 h-3.5" />
              Local MMS Catalog
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: GOOGLE DRIVE CLOUD REPOSITORY */}
      {/* ============================================================== */}
      {activeTab === 'drive' && (
        <div className="space-y-4">
          {/* Auth Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Google Drive Workspace</h2>
                  {isDriveAuthenticated && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                      Connected
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {isDriveAuthenticated && googleUser
                    ? `Authenticated as ${googleUser.displayName || googleUser.email} (${googleUser.email})`
                    : 'Sign in with your Google account to access, view, and store documents in Google Drive.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isDriveAuthenticated ? (
                <button
                  onClick={handleGoogleSignOut}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  Disconnect Drive
                </button>
              ) : (
                /* Official Styled "Sign in with Google" button */
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="flex items-center gap-2.5 px-4 py-2 bg-white border border-slate-300 rounded-lg shadow-xs hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isSigningIn ? 'Connecting...' : 'Sign in with Google'}</span>
                </button>
              )}
            </div>
          </div>

          {!isDriveAuthenticated ? (
            /* Sign-in prompt placeholder */
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs space-y-4">
              <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto">
                <Cloud className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-slate-900">Connect Google Drive Repository</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Authorize Google Drive to browse maintenance folders, view engineering drawings, and directly upload work order inspection documents to cloud storage.
                </p>
              </div>
              <button
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Cloud className="w-4 h-4" />
                Sign in with Google Account
              </button>
            </div>
          ) : (
            /* Authenticated Google Drive Explorer */
            <div className="space-y-4">
              {/* Drive Actions & Filters Bar */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                {/* Search in Drive */}
                <div className="flex-1 min-w-[200px] flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search Google Drive files..."
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') loadDriveFiles(currentFolderId);
                      }}
                      className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => loadDriveFiles(currentFolderId)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700"
                  >
                    Search
                  </button>
                </div>

                {/* Type Filter */}
                <div className="flex items-center gap-2">
                  <select
                    value={driveTypeFilter}
                    onChange={(e) => setDriveTypeFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none"
                  >
                    <option value="all">All File Types</option>
                    <option value="folder">Folders</option>
                    <option value="document">PDF &amp; Documents</option>
                    <option value="spreadsheet">Spreadsheets</option>
                    <option value="image">Images &amp; Drawings</option>
                  </select>

                  <button
                    onClick={() => loadDriveFiles(currentFolderId)}
                    disabled={loadingDrive}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                    title="Refresh Drive files"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingDrive ? 'animate-spin text-blue-600' : ''}`} />
                  </button>

                  <button
                    onClick={() => setShowNewFolderModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
                    New Folder
                  </button>

                  {/* Hidden File Input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingToDrive}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {uploadingToDrive ? 'Uploading...' : 'Upload to Drive'}
                  </button>
                </div>
              </div>

              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 text-xs text-slate-600 px-1 font-medium">
                {folderBreadcrumb.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span className="text-slate-400">/</span>}
                    <button
                      onClick={() => handleBreadcrumbClick(idx)}
                      className={`hover:text-blue-700 truncate max-w-[150px] ${
                        idx === folderBreadcrumb.length - 1 ? 'font-bold text-slate-900' : 'text-slate-500'
                      }`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              {/* Drive Files List / Table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                {loadingDrive ? (
                  <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    <p>Loading Google Drive files...</p>
                  </div>
                ) : driveFiles.length === 0 ? (
                  <div className="p-12 text-center text-xs text-slate-400 space-y-2">
                    <Folder className="w-8 h-8 mx-auto text-slate-300" />
                    <p>No files found in this folder or search criteria.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase font-semibold text-[11px]">
                        <tr>
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">File Type</th>
                          <th className="py-3 px-4">Size</th>
                          <th className="py-3 px-4">Last Modified</th>
                          <th className="py-3 px-4">Owner</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {driveFiles.map((file) => {
                          const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                          return (
                            <tr key={file.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                  {getFileIcon(file.mimeType)}
                                  {isFolder ? (
                                    <button
                                      onClick={() => handleFolderClick(file)}
                                      className="font-bold text-blue-900 hover:underline text-left cursor-pointer"
                                    >
                                      {file.name}
                                    </button>
                                  ) : (
                                    <span className="font-semibold text-slate-900">{file.name}</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-500 font-mono text-[11px] truncate max-w-xs">
                                {isFolder ? 'Folder' : file.mimeType.replace('application/', '')}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                {isFolder ? '-' : formatFileSize(file.size)}
                              </td>
                              <td className="py-3 px-4 text-slate-600 font-mono">
                                {file.modifiedTime ? formatDate(file.modifiedTime) : '-'}
                              </td>
                              <td className="py-3 px-4 text-slate-700">
                                {file.owners?.[0]?.displayName || 'Me'}
                              </td>
                              <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                                {file.webViewLink && (
                                  <a
                                    href={file.webViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-[11px] transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3 text-slate-500" />
                                    Open
                                  </a>
                                )}
                                <button
                                  onClick={() => setFileToDelete(file)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="Delete from Google Drive"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: LOCAL MMS TECHNICAL REPOSITORY */}
      {/* ============================================================== */}
      {activeTab === 'local' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/70 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  categoryFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Documents
              </button>
              {localCategories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`px-3 py-1.5 rounded-md transition-all ${
                    categoryFilter === c ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddDocModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Register Technical Document
            </button>
          </div>

          {/* Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocal.map((doc) => (
              <div key={doc.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] font-bold text-blue-900">{doc.doc_number}</span>
                    <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {doc.category}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2">{doc.title}</h3>

                  <div className="mt-2 text-xs text-slate-500 space-y-1">
                    {doc.asset_name && <div>Asset: <span className="font-semibold text-slate-800">{doc.asset_name}</span></div>}
                    <div>File: <span className="font-mono text-slate-700">{doc.file_name}</span> ({doc.file_size})</div>
                    <div>Uploaded: <span className="font-mono">{formatDate(doc.upload_date)}</span> by {doc.uploaded_by}</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono truncate max-w-[150px]">{doc.tags}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => alert(`Simulated document download for ${doc.file_name}. File verified in secure repository.`)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded font-semibold text-xs transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download PDF
                    </button>
                    <button
                      onClick={() => setLocalDocToDelete(doc)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Hapus Dokumen Teknis (Delete)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: EXPLICIT CONFIRMATION FOR DELETION (WORKSPACE SAFETY)   */}
      {/* ============================================================== */}
      <DeleteConfirmModal
        isOpen={Boolean(fileToDelete)}
        title="Hapus File dari Google Drive"
        itemName={fileToDelete ? fileToDelete.name : ''}
        itemType="Google Drive Document"
        warningText="File ini akan dihapus secara permanen dari Google Drive Technical Workspace Anda."
        isDeleting={isDeleting}
        onCancel={() => setFileToDelete(null)}
        onConfirm={confirmDeleteFile}
      />

      {/* ============================================================== */}
      {/* MODAL: CREATE NEW FOLDER IN GOOGLE DRIVE                       */}
      {/* ============================================================== */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FolderPlus className="w-4 h-4 text-blue-700" />
                Create Folder in Google Drive
              </h3>
              <button onClick={() => setShowNewFolderModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Folder Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Plant NA-2 Equipment Manuals"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Create Folder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: ADD LOCAL DOCUMENT TO REGISTRY                          */}
      {/* ============================================================== */}
      {showAddDocModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Upload Technical Documentation</h2>
              <button onClick={() => setShowAddDocModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocalDoc} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fanuc Robot M-20iA Preventive Maintenance Manual"
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Document Type *</label>
                  <select
                    value={newDoc.category}
                    onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    {localCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Target Equipment</label>
                  <select
                    value={newDoc.asset_id}
                    onChange={(e) => setNewDoc({ ...newDoc, asset_id: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  >
                    <option value="">General Facility</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>{a.asset_tag} - {a.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">File Name</label>
                  <input
                    type="text"
                    required
                    value={newDoc.file_name}
                    onChange={(e) => setNewDoc({ ...newDoc, file_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Tags / Keywords</label>
                  <input
                    type="text"
                    placeholder="e.g. Robot, Wiring, K3"
                    value={newDoc.tags}
                    onChange={(e) => setNewDoc({ ...newDoc, tags: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Document Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Local Document Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(localDocToDelete)}
        title="Hapus Dokumen Teknis"
        itemType="Dokumen Teknis"
        itemName={localDocToDelete ? `[${localDocToDelete.doc_number}] ${localDocToDelete.title}` : ''}
        warningText="Dokumen manual, skematik, atau SOP ini akan dihapus secara permanen dari repositori dokumen."
        isDeleting={isDeletingLocal}
        onConfirm={handleDeleteLocalDoc}
        onCancel={() => setLocalDocToDelete(null)}
      />
    </div>
  );
};
