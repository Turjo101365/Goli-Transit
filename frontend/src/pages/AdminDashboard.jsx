import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminUsers,
  getAdminUserDetails,
  getAdminGuests,
  getAdminSavedRoutes,
  deleteAdminSavedRoute,
  updateAdminUser,
  deleteAdminUser,
  inviteAdminUser,
  getAdminNodes,
  createAdminNode,
  updateAdminNode,
  deleteAdminNode,
  getAdminSettings,
  updateAdminSetting,
  getAdminAuditLogs
} from '../services/admin.service.js';
import { useLanguage } from '../state/LanguageContext.jsx';
import { useTheme } from '../state/ThemeContext.jsx';
import { toBanglaDigits } from '../utils/format.js';
import { Loader } from '../components/UI/Loader.jsx';
import '../styles/tokens.css';

function num(val, lang) {
  if (val === null || val === undefined) return '0';
  return lang === 'bn' ? toBanglaDigits(val) : String(val);
}

function formatDate(value, lang) {
  if (!value) return lang === 'bn' ? 'তথ্য নেই' : 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const day = date.getDate();
  const year = date.getFullYear();
  const monthNamesBn = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  const monthNamesEn = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');

  if (lang === 'bn') {
    return `${toBanglaDigits(day)} ${monthNamesBn[date.getMonth()]} ${toBanglaDigits(year)}, ${toBanglaDigits(hours)}:${toBanglaDigits(minutes)}`;
  }
  return `${day} ${monthNamesEn[date.getMonth()]} ${year}, ${hours}:${minutes}`;
}

export function AdminDashboard({ authUser }) {
  const { lang } = useLanguage();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('users');
  const [userSubTab, setUserSubTab] = useState('users'); // 'users' or 'guests'
  const [networkSubTab, setNetworkSubTab] = useState('nodes'); // 'nodes' or 'saved_routes'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // 1. Users Data & Rich Profile Modal
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [viewingUserDetails, setViewingUserDetails] = useState(null);
  const [loadingUserDetails, setLoadingUserDetails] = useState(false);
  const [userModalTab, setUserModalTab] = useState('overview'); // 'overview', 'routes', 'trips', 'timeline'
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', role: 'user', status: 'active', phone: '' });

  // Admin Invitation State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'admin', tempPassword: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Guests Data
  const [guests, setGuests] = useState([]);
  const [guestTotal, setGuestTotal] = useState(0);
  const [guestSearch, setGuestSearch] = useState('');

  // 2. Transit Network: Nodes & Saved Routes
  const [nodes, setNodes] = useState([]);
  const [nodeSearch, setNodeSearch] = useState('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState('');
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [editingNode, setEditingNode] = useState(null);
  const [nodeForm, setNodeForm] = useState({ id: '', nameBn: '', nameEn: '', lat: 23.8103, lng: 90.4125, type: 'metro_station' });

  const [savedRoutes, setSavedRoutes] = useState([]);
  const [savedRouteTotal, setSavedRouteTotal] = useState(0);
  const [savedRouteSearch, setSavedRouteSearch] = useState('');
  const [savedRouteModeFilter, setSavedRouteModeFilter] = useState('');

  // 3. Settings Data & Audit Logs
  const [settings, setSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    brtaBusBase: 10,
    brtaBusPerKm: 2.5,
    cngBase: 50,
    cngPerKm: 15,
    rickshawBase: 25,
    rickshawPerKm: 20,
    metroBase: 20,
    metroPerKm: 5
  });
  const [auditLogs, setAuditLogs] = useState([]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 6000);
  };

  // Load initial data
  const loadDashboardData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setErrorMessage(null);

    try {
      if (activeTab === 'users') {
        if (userSubTab === 'users') {
          const data = await getAdminUsers({
            query: userSearch,
            role: userRoleFilter,
            status: userStatusFilter
          });
          setUsers(data?.users || []);
          setUserTotal(data?.total || 0);
        } else {
          const data = await getAdminGuests({ query: guestSearch });
          setGuests(data?.guests || []);
          setGuestTotal(data?.total || 0);
        }
      } else if (activeTab === 'network') {
        if (networkSubTab === 'nodes') {
          const data = await getAdminNodes({ search: nodeSearch, type: nodeTypeFilter });
          setNodes(data || []);
        } else if (networkSubTab === 'saved_routes') {
          const data = await getAdminSavedRoutes({
            search: savedRouteSearch,
            mode: savedRouteModeFilter
          });
          setSavedRoutes(data?.routes || []);
          setSavedRouteTotal(data?.total || 0);
        }
      } else if (activeTab === 'settings') {
        const [settingsData, logsData] = await Promise.all([
          getAdminSettings().catch(() => ({})),
          getAdminAuditLogs({ limit: 40 }).catch(() => [])
        ]);
        setSettings(settingsData);
        setAuditLogs(logsData || []);

        if (settingsData?.fare_rules?.value) {
          const fr = settingsData.fare_rules.value;
          setSettingsForm({
            brtaBusBase: fr.brta_bus_base_taka ?? 10,
            brtaBusPerKm: fr.brta_bus_per_km ?? 2.5,
            cngBase: fr.cng_base_taka ?? 50,
            cngPerKm: fr.cng_per_km ?? 15,
            rickshawBase: fr.rickshaw_base_taka ?? 25,
            rickshawPerKm: fr.rickshaw_per_km ?? 20,
            metroBase: fr.metro_base_taka ?? 20,
            metroPerKm: fr.metro_per_km ?? 5
          });
        }
      }
    } catch (err) {
      showError(err.message || 'Failed to load data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [
    activeTab,
    userSubTab,
    networkSubTab,
    userRoleFilter,
    userStatusFilter,
    nodeTypeFilter,
    savedRouteModeFilter
  ]);

  // Debounced search
  useEffect(() => {
    if (activeTab === 'users') {
      const timer = setTimeout(() => loadDashboardData(true), 350);
      return () => clearTimeout(timer);
    }
  }, [userSearch, guestSearch]);

  useEffect(() => {
    if (activeTab === 'network' && networkSubTab === 'nodes') {
      const timer = setTimeout(() => loadDashboardData(true), 350);
      return () => clearTimeout(timer);
    }
    if (activeTab === 'network' && networkSubTab === 'saved_routes') {
      const timer = setTimeout(() => loadDashboardData(true), 350);
      return () => clearTimeout(timer);
    }
  }, [nodeSearch, savedRouteSearch]);

  // User details modal opener
  const handleViewUserDetails = async (userId) => {
    setLoadingUserDetails(true);
    setUserModalTab('overview');
    try {
      const data = await getAdminUserDetails(userId);
      setViewingUserDetails(data);
    } catch (err) {
      showError(err.message || 'Failed to load user profile & activities.');
    } finally {
      setLoadingUserDetails(false);
    }
  };

  // Delete saved route handler
  const handleDeleteSavedRoute = async (routeId, routeName) => {
    const confirmPrompt = lang === 'bn'
      ? `আপনি কি "${routeName || 'এই রুট'}" মুছে ফেলতে চান?`
      : `Delete saved route "${routeName || 'this route'}"?`;
    if (!window.confirm(confirmPrompt)) return;

    try {
      await deleteAdminSavedRoute(routeId);
      showToast(lang === 'bn' ? 'সংরক্ষিত রুট সফলভাবে মুছে ফেলা হয়েছে।' : 'Saved route deleted successfully.');
      if (viewingUserDetails) {
        // Refresh open modal's data
        const updated = await getAdminUserDetails(viewingUserDetails.user.id);
        setViewingUserDetails(updated);
      }
      loadDashboardData(true);
    } catch (err) {
      showError(err.message || 'Failed to delete route.');
    }
  };

  // User Actions
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await updateAdminUser(editingUser.id, editUserForm);
      showToast(lang === 'bn' ? 'ব্যবহারকারীর তথ্য সফলভাবে আপডেট হয়েছে।' : 'User updated successfully.');
      setEditingUser(null);
      loadDashboardData(true);
    } catch (err) {
      showError(err.message);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    const confirmPrompt = lang === 'bn' 
      ? `আপনি কি নিশ্চিত যে "${userName}" মুছে ফেলতে চান?`
      : `Are you sure you want to delete user "${userName}"?`;
    if (!window.confirm(confirmPrompt)) return;

    try {
      await deleteAdminUser(userId);
      showToast(lang === 'bn' ? 'ব্যবহারকারী মুছে ফেলা হয়েছে।' : 'User deleted.');
      loadDashboardData(true);
    } catch (err) {
      showError(err.message);
    }
  };

  const handleInviteAdmin = async (e) => {
    e.preventDefault();
    if (!inviteForm.email) return;
    setInviting(true);
    try {
      const payload = {
        email: inviteForm.email.trim(),
        role: inviteForm.role
      };
      if (inviteForm.name && inviteForm.name.trim()) {
        payload.name = inviteForm.name.trim();
      }
      if (inviteForm.tempPassword && inviteForm.tempPassword.trim()) {
        payload.tempPassword = inviteForm.tempPassword.trim();
      }

      const res = await inviteAdminUser(payload);
      const resData = res?.data || res;
      setInviteResult(resData);
      setCopiedCreds(false);
      showToast(
        lang === 'bn'
          ? `সফলভাবে "${payload.email}" ইনভাইটেশন প্রসেস সম্পন্ন হয়েছে!`
          : `Admin invitation processed successfully for "${payload.email}"!`
      );
      loadDashboardData(true);
    } catch (err) {
      showError(err.message || 'Failed to send admin invitation.');
    } finally {
      setInviting(false);
    }
  };

  // Node Actions
  const handleCreateNode = async (e) => {
    e.preventDefault();
    try {
      await createAdminNode(nodeForm);
      showToast(lang === 'bn' ? 'নতুন ট্রানজিট নোড যুক্ত করা হয়েছে।' : 'New node created successfully.');
      setShowAddNodeModal(false);
      setNodeForm({ id: '', nameBn: '', nameEn: '', lat: 23.8103, lng: 90.4125, type: 'metro_station' });
      loadDashboardData(true);
    } catch (err) {
      showError(err.message);
    }
  };

  const handleUpdateNode = async (e) => {
    e.preventDefault();
    if (!editingNode) return;
    try {
      await updateAdminNode(editingNode.id, nodeForm);
      showToast(lang === 'bn' ? 'স্টেশন/নোড সফলভাবে আপডেট হয়েছে।' : 'Station/node updated successfully.');
      setEditingNode(null);
      loadDashboardData(true);
    } catch (err) {
      showError(err.message);
    }
  };

  const handleDeleteNode = async (nodeId, nodeName) => {
    const confirmPrompt = lang === 'bn'
      ? `আপনি কি "${nodeName}" নোডটি ডিলিট করতে চান?`
      : `Delete transit node "${nodeName}"?`;
    if (!window.confirm(confirmPrompt)) return;
    try {
      await deleteAdminNode(nodeId);
      showToast(lang === 'bn' ? 'নোড ডিলিট সম্পন্ন।' : 'Node deleted.');
      loadDashboardData(true);
    } catch (err) {
      showError(err.message);
    }
  };

  // Settings Actions
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await updateAdminSetting('fare_rules', {
        value: {
          brta_bus_base_taka: Number(settingsForm.brtaBusBase),
          brta_bus_per_km: Number(settingsForm.brtaBusPerKm),
          cng_base_taka: Number(settingsForm.cngBase),
          cng_per_km: Number(settingsForm.cngPerKm),
          rickshaw_base_taka: Number(settingsForm.rickshawBase),
          rickshaw_per_km: Number(settingsForm.rickshawPerKm),
          metro_base_taka: Number(settingsForm.metroBase),
          metro_per_km: Number(settingsForm.metroPerKm)
        },
        description: 'BRTA, Metro & local transit fare calculation parameters'
      });

      showToast(lang === 'bn' ? 'সিস্টেম সেটিংস সফলভাবে সংরক্ষিত হয়েছে।' : 'System settings saved successfully.');
      loadDashboardData(true);
    } catch (err) {
      showError(err.message);
    }
  };

  const TAB_ITEMS = [
    { id: 'users', bn: 'ইউজার ও গেস্ট সেশন', en: 'Users & Guests', icon: '👥' },
    { id: 'network', bn: 'ট্রানজিট নেটওয়ার্ক ও রুট', en: 'Transit Network', icon: '🚇' },
    { id: 'settings', bn: 'সিস্টেম সেটিংস', en: 'System Settings', icon: '⚙️' }
  ];

  return (
    <div className="profile-page-wrapper" style={{ paddingBottom: 60 }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: 80,
          right: 24,
          zIndex: 9999,
          background: 'var(--metro)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 4,
          boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
          fontFamily: 'var(--data)',
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div style={{
          position: 'fixed',
          top: 80,
          right: 24,
          zIndex: 9999,
          background: 'var(--stamp)',
          color: '#fff',
          padding: '12px 20px',
          borderRadius: 4,
          boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
          fontFamily: 'var(--data)',
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <span>⚠️</span>
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="profile-container" style={{ maxWidth: 1240 }}>
        {/* Admin Command Center Hero Card */}
        <div className="profile-hero-card" style={{ borderLeft: '5px solid var(--metro)', background: 'linear-gradient(135deg, var(--ground2) 0%, rgba(0, 103, 71, 0.06) 100%)' }}>
          <div className="profile-hero-left">
            <div className="profile-avatar-wrap">
              <div
                className="profile-avatar"
                style={{
                  fontSize: 28,
                  background: 'linear-gradient(135deg, #006747 0%, #004d34 100%)',
                  color: '#FFFFFF',
                  border: '3px solid var(--ground)',
                  boxShadow: '0 0 0 2px var(--metro)'
                }}
              >
                🛡️
              </div>
              <span className="profile-avatar-online-dot" title="Live System Active" />
            </div>

            <div className="profile-hero-info">
              <div className="profile-hero-name-row">
                <h1 className="profile-hero-name" style={{ fontSize: 23, letterSpacing: '-0.01em' }}>
                  {lang === 'bn' ? 'অ্যাডমিন কমান্ড সেন্টার' : 'Transit Admin Command Center'}
                </h1>
                <span className="profile-tag profile-tag--verified" style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  🛡️ {authUser?.role === 'admin' ? 'SUPER ADMIN' : 'MODERATOR'}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10B981',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                  {lang === 'bn' ? 'লাইভ সিস্টেম সচল' : 'Live System Active'}
                </span>
              </div>

              <p className="profile-hero-email" style={{ fontSize: 13.5, color: 'var(--c70)', marginTop: 3 }}>
                {lang === 'bn' ? 'সুপার অ্যাডমিন অধিবেশন • সম্পূর্ণ ডেটাবেজ ও ট্রানজিট নেটওয়ার্ক নিয়ন্ত্রণ' : 'Super Admin Session • Full database and transit network control'}
              </p>

              <div className="profile-meta-row" style={{ marginTop: 6 }}>
                <span className="profile-id-chip" title="Active Admin Account">
                  <span>👤</span>
                  <span>{authUser?.name || 'Administrator'} ({authUser?.email || 'admin@golitransit.com'})</span>
                </span>
                <span style={{ color: 'var(--c45)', fontSize: 12 }}>•</span>
                <span style={{ color: 'var(--c70)', fontSize: 12.5, fontFamily: 'var(--data)' }}>
                  {lang === 'bn' ? `মোট রেজিস্টার্ড ইউজার: ${num(userTotal, lang)}` : `Total Users: ${userTotal}`}
                </span>
              </div>
            </div>
          </div>

          <div className="profile-hero-actions">
            <button
              type="button"
              className="action-chip"
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
              style={{ fontWeight: 600, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>{refreshing ? '⟳' : '🔄'}</span>
              <span>{refreshing ? (lang === 'bn' ? 'রিফ্রেশ হচ্ছে...' : 'Refreshing...') : (lang === 'bn' ? 'রিফ্রেশ' : 'Refresh Data')}</span>
            </button>
            <button
              type="button"
              className="hero-btn-primary"
              onClick={() => setShowInviteModal(true)}
              style={{ padding: '8px 16px', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
            >
              <span>✉️</span>
              <span>{lang === 'bn' ? 'অ্যাডমিন ইনভাইট' : 'Invite Admin'}</span>
            </button>
          </div>
        </div>

        {/* Modern Segmented Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: 8,
          background: 'var(--ground2)',
          padding: '6px',
          borderRadius: 12,
          border: '1px solid var(--line)',
          overflowX: 'auto',
          boxShadow: 'var(--card-shadow)'
        }}>
          {TAB_ITEMS.map((tab) => {
            const isActive = activeTab === tab.id;
            let countBadge = null;
            if (tab.id === 'users') countBadge = userTotal;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: '1 1 auto',
                  minWidth: 160,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 18px',
                  borderRadius: 8,
                  border: isActive ? '1px solid var(--metro)' : '1px solid transparent',
                  background: isActive ? 'linear-gradient(135deg, rgba(0, 103, 71, 0.15) 0%, rgba(0, 103, 71, 0.08) 100%)' : 'transparent',
                  color: isActive ? 'var(--metro)' : 'var(--c70)',
                  fontFamily: 'var(--data)',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  whiteSpace: 'nowrap',
                  boxShadow: isActive ? '0 2px 8px rgba(0, 103, 71, 0.12)' : 'none'
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                <span>{lang === 'bn' ? tab.bn : tab.en}</span>
                {countBadge !== null && countBadge > 0 && (
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 10,
                    background: isActive ? 'var(--metro)' : 'var(--ground)',
                    color: isActive ? '#FFFFFF' : 'var(--c70)',
                    border: '1px solid var(--line)'
                  }}>
                    {num(countBadge, lang)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <Loader />
            <p style={{ marginTop: 14, color: 'var(--c70)', fontFamily: 'var(--data)' }}>
              {lang === 'bn' ? 'ডেটাবেজ থেকে তথ্য লোড হচ্ছে...' : 'Loading live database records...'}
            </p>
          </div>
        ) : (
          <div>
            {/* ----------------- TAB 1: USERS & GUESTS ----------------- */}
            {activeTab === 'users' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                {/* Sub-tab switcher: Regular Registered Users vs Guest Logins */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`action-chip ${userSubTab === 'users' ? 'action-chip--highlight' : ''}`}
                    onClick={() => setUserSubTab('users')}
                    style={{ fontWeight: 700 }}
                  >
                    👤 {lang === 'bn' ? 'রেজিস্টার্ড ইউজার' : 'Registered Users'} ({num(userTotal, lang)})
                  </button>
                  <button
                    type="button"
                    className={`action-chip ${userSubTab === 'guests' ? 'action-chip--highlight' : ''}`}
                    onClick={() => setUserSubTab('guests')}
                    style={{ fontWeight: 700 }}
                  >
                    🎟️ {lang === 'bn' ? 'গেস্ট লগইন সেশন (MySQL DB)' : 'Guest Logins & Sessions'} ({num(guestTotal, lang)})
                  </button>
                  <button
                    type="button"
                    className="action-chip"
                    onClick={() => setShowInviteModal(true)}
                    style={{ fontWeight: 700, marginLeft: 'auto', borderColor: 'var(--metro)', color: 'var(--metro)', background: 'rgba(0, 103, 71, 0.08)' }}
                  >
                    {lang === 'bn' ? '✉️ + নতুন অ্যাডমিন ইনভাইট' : '✉️ + Invite New Admin'}
                  </button>
                </div>

                {userSubTab === 'users' ? (
                  <>
                    {/* Search & Filter Bar */}
                    <div className="profile-card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <input
                          type="text"
                          className="profile-form-input"
                          placeholder={lang === 'bn' ? '🔍 নাম, ইমেইল বা ফোন দিয়ে খুঁজুন...' : '🔍 Search by name, email or phone...'}
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                        />
                      </div>

                      <select
                        className="profile-form-input"
                        style={{ width: 'auto', minWidth: 140 }}
                        value={userRoleFilter}
                        onChange={(e) => setUserRoleFilter(e.target.value)}
                      >
                        <option value="">{lang === 'bn' ? 'সকল রোল' : 'All Roles'}</option>
                        <option value="admin">Admin</option>
                        <option value="moderator">Moderator</option>
                        <option value="user">User / Commuter</option>
                      </select>

                      <select
                        className="profile-form-input"
                        style={{ width: 'auto', minWidth: 140 }}
                        value={userStatusFilter}
                        onChange={(e) => setUserStatusFilter(e.target.value)}
                      >
                        <option value="">{lang === 'bn' ? 'সকল স্ট্যাটাস' : 'All Status'}</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="banned">Banned</option>
                      </select>
                    </div>

                    {/* Users Table */}
                    <div className="profile-card" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, fontFamily: 'var(--data)' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--c70)', textAlign: 'left' }}>
                            <th style={{ padding: '10px 12px' }}>ID</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'ব্যবহারকারী' : 'User'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'রোল' : 'Role'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'ট্রিপ' : 'Trips'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'সংরক্ষিত রুট' : 'Saved Routes'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'যোগদানের তারিখ' : 'Joined'}</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>{lang === 'bn' ? 'অ্যাকশন' : 'Actions'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.length === 0 ? (
                            <tr>
                              <td colSpan={8} style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--c70)' }}>
                                {lang === 'bn' ? 'কোনো ব্যবহারকারী পাওয়া যায়নি।' : 'No users found matching query.'}
                              </td>
                            </tr>
                          ) : (
                            users.map((u) => (
                              <tr key={u.id} style={{ borderBottom: '1px solid var(--line)' }}>
                                <td style={{ padding: '10px 12px', color: 'var(--c70)' }}>#{u.id}</td>
                                <td style={{ padding: '10px 12px' }}>
                                  <div style={{ fontWeight: 600, color: 'var(--cream)' }}>
                                    {u.name}
                                    {u.role === 'admin' && (
                                      <span style={{ marginLeft: 6, fontSize: 10.5, background: 'var(--metro)', color: '#fff', padding: '1px 6px', borderRadius: 3, fontWeight: 700 }}>
                                        {u.id === 1 ? 'SUPER ADMIN' : 'ADMIN'}
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--c70)' }}>{u.email}</div>
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <span style={{
                                    padding: '3px 8px',
                                    borderRadius: 3,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    background: u.role === 'admin' ? 'rgba(39, 185, 122, 0.2)' : (u.role === 'moderator' ? 'rgba(217, 114, 64, 0.2)' : 'var(--ground2)'),
                                    color: u.role === 'admin' ? 'var(--metro)' : (u.role === 'moderator' ? 'var(--sev-3)' : 'var(--cream)')
                                  }}>
                                    {u.role}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <span style={{
                                    padding: '3px 8px',
                                    borderRadius: 3,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: u.status === 'active' ? 'rgba(39, 185, 122, 0.15)' : 'rgba(224, 90, 58, 0.15)',
                                    color: u.status === 'active' ? 'var(--metro)' : 'var(--stamp)'
                                  }}>
                                    {u.status}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px', color: 'var(--cream)' }}>
                                  {num(u.tripCount, lang)}
                                </td>
                                <td style={{ padding: '10px 12px', color: 'var(--metro)', fontWeight: 600 }}>
                                  {num(u.savedRoutesCount, lang)}
                                </td>
                                <td style={{ padding: '10px 12px', color: 'var(--c70)', fontSize: 12.5 }}>
                                  {formatDate(u.createdAt, lang)}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: 6 }}>
                                    <button
                                      type="button"
                                      className="action-chip"
                                      onClick={() => handleViewUserDetails(u.id)}
                                      title={lang === 'bn' ? 'ইউজার প্রোফাইল ও অ্যাক্টিভিটি দেখুন' : 'View User Profile & Activity'}
                                      style={{ padding: '4px 8px', fontSize: 12 }}
                                    >
                                      👁️
                                    </button>
                                    <button
                                      type="button"
                                      className="action-chip"
                                      onClick={() => {
                                        setEditingUser(u);
                                        setEditUserForm({
                                          name: u.name,
                                          role: u.role,
                                          status: u.status,
                                          phone: u.phone || ''
                                        });
                                      }}
                                      style={{ padding: '4px 8px', fontSize: 12 }}
                                    >
                                      ✏️ {lang === 'bn' ? 'এডিট' : 'Edit'}
                                    </button>
                                    {authUser?.id !== u.id && authUser?.role === 'admin' && (
                                      <button
                                        type="button"
                                        className="action-chip action-chip--logout"
                                        onClick={() => handleDeleteUser(u.id, u.name)}
                                        style={{ padding: '4px 8px', fontSize: 12 }}
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  /* GUEST SESSIONS VIEW */
                  <>
                    <div className="profile-card" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <input
                        type="text"
                        className="profile-form-input"
                        placeholder={lang === 'bn' ? '🔍 গেস্ট আইডি বা ইমেইল দিয়ে খুঁজুন...' : '🔍 Search guest ID / email...'}
                        value={guestSearch}
                        onChange={(e) => setGuestSearch(e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <span style={{ fontSize: 13, color: 'var(--c70)' }}>
                        {lang === 'bn' ? `মোট ${num(guestTotal, lang)} টি গেস্ট সেশন (ডেটাবেজে সংরক্ষিত)` : `Total ${guestTotal} guest sessions in database`}
                      </span>
                    </div>

                    <div className="profile-card" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, fontFamily: 'var(--data)' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--c70)', textAlign: 'left' }}>
                            <th style={{ padding: '10px 12px' }}>DB ID</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'গেস্ট আইডেন্টিটি (Email / Tag)' : 'Guest Identity (Email)'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'ট্রিপ সংখ্যা' : 'Logged Trips'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'সংরক্ষিত রুট' : 'Saved Routes'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'লগইন সময়' : 'Access Timestamp'}</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>{lang === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {guests.length === 0 ? (
                            <tr>
                              <td colSpan={7} style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--c70)' }}>
                                {lang === 'bn' ? 'কোনো গেস্ট সেশন পাওয়া যায়নি।' : 'No guest user sessions recorded.'}
                              </td>
                            </tr>
                          ) : (
                            guests.map((g) => (
                              <tr key={g.id} style={{ borderBottom: '1px solid var(--line)' }}>
                                <td style={{ padding: '10px 12px', color: 'var(--c70)' }}>#{g.id}</td>
                                <td style={{ padding: '10px 12px' }}>
                                  <div style={{ fontWeight: 600, color: 'var(--cream)' }}>
                                    🎟️ {g.name}
                                  </div>
                                  <code style={{ fontSize: 12, color: 'var(--metro)' }}>{g.email}</code>
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 11, background: 'rgba(39, 185, 122, 0.15)', color: 'var(--metro)', fontWeight: 600 }}>
                                    {g.status}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px', color: 'var(--cream)' }}>
                                  {num(g.tripCount, lang)}
                                </td>
                                <td style={{ padding: '10px 12px', color: 'var(--metro)', fontWeight: 600 }}>
                                  {num(g.savedRoutesCount, lang)}
                                </td>
                                <td style={{ padding: '10px 12px', color: 'var(--c70)', fontSize: 12.5 }}>
                                  {formatDate(g.createdAt, lang)}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: 6 }}>
                                    <button
                                      type="button"
                                      className="action-chip"
                                      onClick={() => handleViewUserDetails(g.id)}
                                      title={lang === 'bn' ? 'গেস্ট প্রোফাইল ও অ্যাক্টিভিটি দেখুন' : 'View Guest Details & Activity'}
                                      style={{ padding: '3px 8px', fontSize: 12 }}
                                    >
                                      👁️
                                    </button>
                                    <button
                                      type="button"
                                      className="action-chip action-chip--logout"
                                      onClick={() => handleDeleteUser(g.id, g.email)}
                                      style={{ padding: '3px 8px', fontSize: 12 }}
                                    >
                                      🗑️ {lang === 'bn' ? 'মুছুন' : 'Delete'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ----------------- TAB 2: TRANSIT NETWORK & ROUTE MANAGEMENT ----------------- */}
            {activeTab === 'network' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                {/* Sub-tab selector */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={`action-chip ${networkSubTab === 'nodes' ? 'action-chip--highlight' : ''}`}
                      onClick={() => setNetworkSubTab('nodes')}
                      style={{ fontWeight: 700 }}
                    >
                      🚇 {lang === 'bn' ? 'স্টেশন ও ট্রানজিট নোড' : 'Stations & Nodes'} ({num(nodes.length, lang)})
                    </button>
                    <button
                      type="button"
                      className={`action-chip ${networkSubTab === 'saved_routes' ? 'action-chip--highlight' : ''}`}
                      onClick={() => setNetworkSubTab('saved_routes')}
                      style={{ fontWeight: 700 }}
                    >
                      🧭 {lang === 'bn' ? 'সংরক্ষিত রুটসমূহ' : 'Commuter Saved Routes'} ({num(savedRouteTotal, lang)})
                    </button>
                  </div>

                  {networkSubTab === 'nodes' && (
                    <button
                      type="button"
                      className="action-chip action-chip--highlight"
                      onClick={() => {
                        setNodeForm({ id: '', nameBn: '', nameEn: '', lat: 23.8103, lng: 90.4125, type: 'metro_station' });
                        setShowAddNodeModal(true);
                      }}
                      style={{ fontWeight: 700 }}
                    >
                      + {lang === 'bn' ? 'নতুন নোড যোগ করুন' : 'Add Station / Node'}
                    </button>
                  )}
                </div>

                {/* 1. NODES SUB-VIEW */}
                {networkSubTab === 'nodes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="profile-card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="profile-form-input"
                        placeholder={lang === 'bn' ? '🔍 নোড বা স্টেশনের নাম দিয়ে খুঁজুন...' : '🔍 Search station or node name...'}
                        value={nodeSearch}
                        onChange={(e) => setNodeSearch(e.target.value)}
                        style={{ flex: 1, minWidth: 200 }}
                      />
                      <select
                        className="profile-form-input"
                        style={{ width: 'auto', minWidth: 150 }}
                        value={nodeTypeFilter}
                        onChange={(e) => setNodeTypeFilter(e.target.value)}
                      >
                        <option value="">{lang === 'bn' ? 'সকল টাইপ' : 'All Types'}</option>
                        <option value="metro_station">Metro Station (MRT-6)</option>
                        <option value="bus_stop">Bus Stop</option>
                        <option value="landmark">Landmark</option>
                      </select>
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                      gap: 12
                    }}>
                      {nodes.map((node) => (
                        <div key={node.id} className="profile-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: 3,
                                fontSize: 10.5,
                                fontWeight: 700,
                                background: node.type === 'metro_station' ? 'rgba(39, 185, 122, 0.2)' : 'var(--ground2)',
                                color: node.type === 'metro_station' ? 'var(--metro)' : 'var(--cream)',
                                textTransform: 'uppercase'
                              }}>
                                {node.type.replace('_', ' ')}
                              </span>
                              <code style={{ fontSize: 11, color: 'var(--c70)' }}>{node.id}</code>
                            </div>

                            <h4 style={{ margin: '4px 0', fontSize: 16, color: 'var(--cream)' }}>
                              {lang === 'bn' ? node.nameBn : node.nameEn}
                            </h4>
                            <div style={{ fontSize: 12.5, color: 'var(--c70)' }}>
                              {lang === 'bn' ? node.nameEn : node.nameBn}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--c45)', marginTop: 6 }}>
                              📍 {node.lat.toFixed(4)}, {node.lng.toFixed(4)}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
                            <button
                              type="button"
                              className="action-chip"
                              onClick={() => {
                                setEditingNode(node);
                                setNodeForm({
                                  id: node.id,
                                  nameBn: node.nameBn,
                                  nameEn: node.nameEn,
                                  lat: node.lat,
                                  lng: node.lng,
                                  type: node.type
                                });
                              }}
                              style={{ padding: '2px 8px', fontSize: 11.5 }}
                            >
                              ✏️ {lang === 'bn' ? 'এডিট' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              className="action-chip action-chip--logout"
                              onClick={() => handleDeleteNode(node.id, node.nameEn)}
                              style={{ padding: '2px 8px', fontSize: 11.5 }}
                            >
                              🗑️ {lang === 'bn' ? 'মুছুন' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. SAVED ROUTES SUB-VIEW */}
                {networkSubTab === 'saved_routes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="profile-card" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <input
                          type="text"
                          className="profile-form-input"
                          placeholder={lang === 'bn' ? '🔍 রুট নাম, যাত্রী, শুরু বা গন্তব্য দিয়ে খুঁজুন...' : '🔍 Search route, commuter, origin, destination...'}
                          value={savedRouteSearch}
                          onChange={(e) => setSavedRouteSearch(e.target.value)}
                        />
                      </div>

                      <select
                        className="profile-form-input"
                        style={{ width: 'auto', minWidth: 150 }}
                        value={savedRouteModeFilter}
                        onChange={(e) => setSavedRouteModeFilter(e.target.value)}
                      >
                        <option value="">{lang === 'bn' ? 'সকল মোড' : 'All Modes'}</option>
                        <option value="metro">Metro</option>
                        <option value="bus">Bus</option>
                        <option value="cng">CNG</option>
                        <option value="rickshaw">Rickshaw</option>
                        <option value="walk">Walk</option>
                      </select>
                    </div>

                    <div className="profile-card" style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, fontFamily: 'var(--data)' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--c70)', textAlign: 'left' }}>
                            <th style={{ padding: '10px 12px' }}>ID</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'রুটের নাম' : 'Route Name'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'সংরক্ষণকারী যাত্রী' : 'Saved By (Commuter)'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'শুরু (Origin)' : 'Origin'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'গন্তব্য (Destination)' : 'Destination'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'মোড' : 'Mode'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'সময়' : 'Duration'}</th>
                            <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'সংরক্ষণ তারিখ' : 'Saved On'}</th>
                            <th style={{ padding: '10px 12px', textAlign: 'right' }}>{lang === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {savedRoutes.length === 0 ? (
                            <tr>
                              <td colSpan={9} style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--c70)' }}>
                                {lang === 'bn' ? 'কোনো সংরক্ষিত রুট পাওয়া যায়নি।' : 'No saved commuter routes found.'}
                              </td>
                            </tr>
                          ) : (
                            savedRoutes.map((r) => (
                              <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                                <td style={{ padding: '10px 12px', color: 'var(--c70)' }}>#{r.id}</td>
                                <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--cream)' }}>
                                  🧭 {r.name}
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div>
                                      <div style={{ fontWeight: 600, color: 'var(--cream)' }}>
                                        {r.userName || `User #${r.userId}`}
                                      </div>
                                      <div style={{ fontSize: 12, color: 'var(--c70)' }}>{r.userEmail}</div>
                                    </div>
                                    {r.userId && (
                                      <button
                                        type="button"
                                        className="action-chip"
                                        onClick={() => handleViewUserDetails(r.userId)}
                                        title={lang === 'bn' ? 'এই যাত্রীর সম্পূর্ণ প্রোফাইল ও অ্যাক্টিভিটি দেখুন' : 'View this commuter profile & activity'}
                                        style={{ padding: '2px 6px', fontSize: 11, marginLeft: 4 }}
                                      >
                                        👁️
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: '10px 12px', color: 'var(--cream)' }}>
                                  📍 {r.fromLocation}
                                </td>
                                <td style={{ padding: '10px 12px', color: 'var(--cream)' }}>
                                  🏁 {r.toLocation}
                                </td>
                                <td style={{ padding: '10px 12px' }}>
                                  <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 11, background: 'var(--ground2)', color: 'var(--cream)', textTransform: 'uppercase' }}>
                                    {r.mode}
                                  </span>
                                </td>
                                <td style={{ padding: '10px 12px', color: 'var(--metro)', fontWeight: 600 }}>
                                  {r.durationMinutes ? `${num(r.durationMinutes, lang)} ${lang === 'bn' ? 'মি.' : 'min'}` : '—'}
                                </td>
                                <td style={{ padding: '10px 12px', color: 'var(--c70)', fontSize: 12 }}>
                                  {formatDate(r.createdAt, lang)}
                                </td>
                                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                                  <div style={{ display: 'inline-flex', gap: 6 }}>
                                    <button
                                      type="button"
                                      className="action-chip action-chip--logout"
                                      onClick={() => handleDeleteSavedRoute(r.id, r.name)}
                                      title={lang === 'bn' ? 'সংরক্ষিত রুট মুছুন' : 'Delete Saved Route'}
                                      style={{ padding: '3px 8px', fontSize: 12 }}
                                    >
                                      🗑️
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Add Node Modal */}
                {showAddNodeModal && (
                  <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    padding: 16
                  }}>
                    <div className="profile-card" style={{ maxWidth: 480, width: '100%', border: '1px solid var(--metro)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 18, color: 'var(--cream)' }}>
                          {lang === 'bn' ? 'নতুন ট্রানজিট নোড যুক্ত করুন' : 'Add New Transit Node / Station'}
                        </h3>
                        <button type="button" className="action-chip" onClick={() => setShowAddNodeModal(false)}>✕</button>
                      </div>

                      <form onSubmit={handleCreateNode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="profile-form-group">
                          <label className="profile-form-label">{lang === 'bn' ? 'নোড আইডি (যেমন: mrt_mohakhali)' : 'Node ID (e.g. mrt_mohakhali)'}</label>
                          <input
                            type="text"
                            className="profile-form-input"
                            value={nodeForm.id}
                            onChange={(e) => setNodeForm({ ...nodeForm, id: e.target.value })}
                            required
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'নাম (বাংলা)' : 'Name (Bangla)'}</label>
                            <input
                              type="text"
                              className="profile-form-input"
                              value={nodeForm.nameBn}
                              onChange={(e) => setNodeForm({ ...nodeForm, nameBn: e.target.value })}
                              required
                            />
                          </div>

                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'নাম (ইংরেজি)' : 'Name (English)'}</label>
                            <input
                              type="text"
                              className="profile-form-input"
                              value={nodeForm.nameEn}
                              onChange={(e) => setNodeForm({ ...nodeForm, nameEn: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'অক্ষাংশ (Latitude)' : 'Latitude'}</label>
                            <input
                              type="number"
                              step="0.000001"
                              className="profile-form-input"
                              value={nodeForm.lat}
                              onChange={(e) => setNodeForm({ ...nodeForm, lat: parseFloat(e.target.value) })}
                              required
                            />
                          </div>

                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'দ্রাঘিমাংশ (Longitude)' : 'Longitude'}</label>
                            <input
                              type="number"
                              step="0.000001"
                              className="profile-form-input"
                              value={nodeForm.lng}
                              onChange={(e) => setNodeForm({ ...nodeForm, lng: parseFloat(e.target.value) })}
                              required
                            />
                          </div>
                        </div>

                        <div className="profile-form-group">
                          <label className="profile-form-label">{lang === 'bn' ? 'নোড টাইপ' : 'Node Type'}</label>
                          <select
                            className="profile-form-input"
                            value={nodeForm.type}
                            onChange={(e) => setNodeForm({ ...nodeForm, type: e.target.value })}
                          >
                            <option value="metro_station">Metro Station (MRT-6)</option>
                            <option value="bus_stop">Bus Stop</option>
                            <option value="landmark">Landmark / Interchange</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                          <button type="button" className="action-chip" onClick={() => setShowAddNodeModal(false)}>
                            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                          </button>
                          <button type="submit" className="action-chip action-chip--highlight" style={{ fontWeight: 700 }}>
                            {lang === 'bn' ? '✓ নোড সংরক্ষণ' : '✓ Create Node'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Edit Node Modal */}
                {editingNode && (
                  <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    padding: 16
                  }}>
                    <div className="profile-card" style={{ maxWidth: 480, width: '100%', border: '1px solid var(--metro)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 18, color: 'var(--cream)' }}>
                          {lang === 'bn' ? 'স্টেশন/নোড এডিট করুন' : 'Edit Transit Node / Station'}
                        </h3>
                        <button type="button" className="action-chip" onClick={() => setEditingNode(null)}>✕</button>
                      </div>

                      <form onSubmit={handleUpdateNode} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="profile-form-group">
                          <label className="profile-form-label">ID (Read Only)</label>
                          <input
                            type="text"
                            className="profile-form-input"
                            value={editingNode.id}
                            disabled
                            style={{ opacity: 0.7 }}
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'নাম (বাংলা)' : 'Name (Bangla)'}</label>
                            <input
                              type="text"
                              className="profile-form-input"
                              value={nodeForm.nameBn}
                              onChange={(e) => setNodeForm({ ...nodeForm, nameBn: e.target.value })}
                              required
                            />
                          </div>

                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'নাম (ইংরেজি)' : 'Name (English)'}</label>
                            <input
                              type="text"
                              className="profile-form-input"
                              value={nodeForm.nameEn}
                              onChange={(e) => setNodeForm({ ...nodeForm, nameEn: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'অক্ষাংশ (Latitude)' : 'Latitude'}</label>
                            <input
                              type="number"
                              step="0.000001"
                              className="profile-form-input"
                              value={nodeForm.lat}
                              onChange={(e) => setNodeForm({ ...nodeForm, lat: parseFloat(e.target.value) })}
                              required
                            />
                          </div>

                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'দ্রাঘিমাংশ (Longitude)' : 'Longitude'}</label>
                            <input
                              type="number"
                              step="0.000001"
                              className="profile-form-input"
                              value={nodeForm.lng}
                              onChange={(e) => setNodeForm({ ...nodeForm, lng: parseFloat(e.target.value) })}
                              required
                            />
                          </div>
                        </div>

                        <div className="profile-form-group">
                          <label className="profile-form-label">{lang === 'bn' ? 'নোড টাইপ' : 'Node Type'}</label>
                          <select
                            className="profile-form-input"
                            value={nodeForm.type}
                            onChange={(e) => setNodeForm({ ...nodeForm, type: e.target.value })}
                          >
                            <option value="metro_station">Metro Station (MRT-6)</option>
                            <option value="bus_stop">Bus Stop</option>
                            <option value="landmark">Landmark / Interchange</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                          <button type="button" className="action-chip" onClick={() => setEditingNode(null)}>
                            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                          </button>
                          <button type="submit" className="action-chip action-chip--highlight" style={{ fontWeight: 700 }}>
                            {lang === 'bn' ? '✓ পরিবর্তন সংরক্ষণ' : '✓ Save Changes'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ----------------- TAB 3: SYSTEM SETTINGS ----------------- */}
            {activeTab === 'settings' && (
              <div style={{ maxWidth: 860, margin: '16px auto 0' }}>
                {/* System Settings Editor */}
                <div className="profile-card">
                  <h3 style={{ margin: '0 0 16px', fontSize: 17, color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>⚙️</span>
                    <span>{lang === 'bn' ? 'সিস্টেম ও ফেয়ার কনফিগারেশন' : 'Fare Rules & System Config'}</span>
                  </h3>

                  <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--metro)', borderBottom: '1px solid var(--line)', paddingBottom: 4 }}>
                       🚌 {lang === 'bn' ? 'বিআরটিএ বাস ও লোকাল ভাড়া' : 'BRTA Bus & Local Fare Rules'}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div className="profile-form-group">
                        <label className="profile-form-label">{lang === 'bn' ? 'বাস বেস ভাড়া (৳)' : 'Bus Base Fare (৳)'}</label>
                        <input
                          type="number"
                          className="profile-form-input"
                          value={settingsForm.brtaBusBase}
                          onChange={(e) => setSettingsForm({ ...settingsForm, brtaBusBase: e.target.value })}
                        />
                      </div>
                      <div className="profile-form-group">
                        <label className="profile-form-label">{lang === 'bn' ? 'বাস প্রতি কিমি (৳)' : 'Bus Per Km (৳)'}</label>
                        <input
                          type="number"
                          step="0.1"
                          className="profile-form-input"
                          value={settingsForm.brtaBusPerKm}
                          onChange={(e) => setSettingsForm({ ...settingsForm, brtaBusPerKm: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div className="profile-form-group">
                        <label className="profile-form-label">{lang === 'bn' ? 'সিএনজি বেস ভাড়া (৳)' : 'CNG Base Fare (৳)'}</label>
                        <input
                          type="number"
                          className="profile-form-input"
                          value={settingsForm.cngBase}
                          onChange={(e) => setSettingsForm({ ...settingsForm, cngBase: e.target.value })}
                        />
                      </div>
                      <div className="profile-form-group">
                        <label className="profile-form-label">{lang === 'bn' ? 'সিএনজি প্রতি কিমি (৳)' : 'CNG Per Km (৳)'}</label>
                        <input
                          type="number"
                          step="0.5"
                          className="profile-form-input"
                          value={settingsForm.cngPerKm}
                          onChange={(e) => setSettingsForm({ ...settingsForm, cngPerKm: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--metro)', borderBottom: '1px solid var(--line)', paddingBottom: 4, marginTop: 4 }}>
                       🚲 {lang === 'bn' ? 'রিকশা ভাড়া' : 'Rickshaw Fare Rules'}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div className="profile-form-group">
                        <label className="profile-form-label">{lang === 'bn' ? 'রিকশা বেস ভাড়া (৳)' : 'Rickshaw Base Fare (৳)'}</label>
                        <input
                          type="number"
                          className="profile-form-input"
                          value={settingsForm.rickshawBase}
                          onChange={(e) => setSettingsForm({ ...settingsForm, rickshawBase: e.target.value })}
                        />
                      </div>
                      <div className="profile-form-group">
                        <label className="profile-form-label">{lang === 'bn' ? 'রিকশা প্রতি কিমি (৳)' : 'Rickshaw Per Km (৳)'}</label>
                        <input
                          type="number"
                          step="0.5"
                          className="profile-form-input"
                          value={settingsForm.rickshawPerKm}
                          onChange={(e) => setSettingsForm({ ...settingsForm, rickshawPerKm: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--metro)', borderBottom: '1px solid var(--line)', paddingBottom: 4, marginTop: 4 }}>
                       🚇 {lang === 'bn' ? 'মেট্রোরেল ভাড়া' : 'Metro Rail Fare Rules'}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div className="profile-form-group">
                        <label className="profile-form-label">{lang === 'bn' ? 'মেট্রো বেস ভাড়া (৳)' : 'Metro Base Fare (৳)'}</label>
                        <input
                          type="number"
                          className="profile-form-input"
                          value={settingsForm.metroBase}
                          onChange={(e) => setSettingsForm({ ...settingsForm, metroBase: e.target.value })}
                        />
                      </div>
                      <div className="profile-form-group">
                        <label className="profile-form-label">{lang === 'bn' ? 'মেট্রো প্রতি কিমি (৳)' : 'Metro Per Km (৳)'}</label>
                        <input
                          type="number"
                          step="0.5"
                          className="profile-form-input"
                          value={settingsForm.metroPerKm}
                          onChange={(e) => setSettingsForm({ ...settingsForm, metroPerKm: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <button type="submit" className="action-chip action-chip--highlight" style={{ fontWeight: 700 }}>
                        {lang === 'bn' ? '✓ সেটিংস সংরক্ষণ করুন' : '✓ Save System Settings'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Comprehensive User Profile, Saved Routes & Activity Modal */}
      {(viewingUserDetails || loadingUserDetails) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.82)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 16
        }}>
          <div className="profile-card" style={{ maxWidth: 840, width: '100%', maxHeight: '92vh', overflowY: 'auto', border: '1px solid var(--metro)', padding: 22 }}>
            {loadingUserDetails && !viewingUserDetails ? (
              <div style={{ padding: '50px 0', textAlign: 'center' }}>
                <Loader />
                <p style={{ marginTop: 14, color: 'var(--c70)', fontFamily: 'var(--data)' }}>
                  {lang === 'bn' ? 'ব্যবহারকারীর বিস্তারিত তথ্য ও অ্যাক্টিভিটি লোড হচ্ছে...' : 'Loading commuter profile & activity timeline...'}
                </p>
              </div>
            ) : viewingUserDetails && (
              <div>
                {/* Modal Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 44,
                      height: 44,
                      borderRadius: '50%',
                      background: 'var(--ground2)',
                      border: '2px solid var(--metro)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20
                    }}>
                      {viewingUserDetails.user.role === 'admin' ? '🛡️' : (viewingUserDetails.user.role === 'guest' ? '🎟️' : '👤')}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ margin: 0, fontSize: 19, color: 'var(--cream)' }}>
                          {viewingUserDetails.user.name}
                        </h3>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 3,
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          background: viewingUserDetails.user.role === 'admin' ? 'rgba(39, 185, 122, 0.2)' : 'var(--ground2)',
                          color: viewingUserDetails.user.role === 'admin' ? 'var(--metro)' : 'var(--cream)'
                        }}>
                          {viewingUserDetails.user.role}
                        </span>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 3,
                          fontSize: 11,
                          fontWeight: 600,
                          background: viewingUserDetails.user.status === 'active' ? 'rgba(39, 185, 122, 0.15)' : 'rgba(224, 90, 58, 0.15)',
                          color: viewingUserDetails.user.status === 'active' ? 'var(--metro)' : 'var(--stamp)'
                        }}>
                          {viewingUserDetails.user.status}
                        </span>
                      </div>
                      <code style={{ fontSize: 12.5, color: 'var(--metro)' }}>{viewingUserDetails.user.email}</code>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="action-chip"
                    onClick={() => setViewingUserDetails(null)}
                    style={{ padding: '6px 12px', fontSize: 13 }}
                  >
                    ✕ {lang === 'bn' ? 'বন্ধ করুন' : 'Close'}
                  </button>
                </div>

                {/* Modal Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 8, overflowX: 'auto' }}>
                  <button
                    type="button"
                    className={`action-chip ${userModalTab === 'overview' ? 'action-chip--highlight' : ''}`}
                    onClick={() => setUserModalTab('overview')}
                    style={{ fontWeight: 600 }}
                  >
                    📊 {lang === 'bn' ? 'প্রোফাইল বিবরণী' : 'Overview & Stats'}
                  </button>
                  <button
                    type="button"
                    className={`action-chip ${userModalTab === 'routes' ? 'action-chip--highlight' : ''}`}
                    onClick={() => setUserModalTab('routes')}
                    style={{ fontWeight: 600 }}
                  >
                    🧭 {lang === 'bn' ? 'সংরক্ষিত রুটসমূহ' : 'Saved Routes'} ({num(viewingUserDetails.savedRoutes?.length || 0, lang)})
                  </button>
                  <button
                    type="button"
                    className={`action-chip ${userModalTab === 'trips' ? 'action-chip--highlight' : ''}`}
                    onClick={() => setUserModalTab('trips')}
                    style={{ fontWeight: 600 }}
                  >
                    🚗 {lang === 'bn' ? 'সম্পন্ন করা ট্রিপ' : 'Completed Trips'} ({num(viewingUserDetails.trips?.length || 0, lang)})
                  </button>
                  <button
                    type="button"
                    className={`action-chip ${userModalTab === 'timeline' ? 'action-chip--highlight' : ''}`}
                    onClick={() => setUserModalTab('timeline')}
                    style={{ fontWeight: 600 }}
                  >
                    ⚡ {lang === 'bn' ? 'অ্যাক্টিভিটি টাইমলাইন' : 'Activity Timeline'} ({num(viewingUserDetails.activities?.length || 0, lang)})
                  </button>
                </div>

                {/* TAB 1: USER OVERVIEW & METRICS */}
                {userModalTab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Key Stats Counter Tiles */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                      <div style={{ background: 'var(--ground)', padding: '12px 14px', borderRadius: 6, border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: 11.5, color: 'var(--c70)' }}>{lang === 'bn' ? 'মোট ট্রিপ' : 'Total Trips'}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--cream)', marginTop: 4 }}>
                          {num(viewingUserDetails.stats?.totalTrips || 0, lang)}
                        </div>
                      </div>
                      <div style={{ background: 'var(--ground)', padding: '12px 14px', borderRadius: 6, border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: 11.5, color: 'var(--c70)' }}>{lang === 'bn' ? 'মোট দূরত্ব' : 'Total Distance'}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--metro)', marginTop: 4 }}>
                          {num(viewingUserDetails.stats?.totalDistanceKm || 0, lang)} km
                        </div>
                      </div>
                      <div style={{ background: 'var(--ground)', padding: '12px 14px', borderRadius: 6, border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: 11.5, color: 'var(--c70)' }}>{lang === 'bn' ? 'সংরক্ষিত রুট' : 'Saved Routes'}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--cream)', marginTop: 4 }}>
                          {num(viewingUserDetails.stats?.totalSavedRoutes || 0, lang)}
                        </div>
                      </div>
                      <div style={{ background: 'var(--ground)', padding: '12px 14px', borderRadius: 6, border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: 11.5, color: 'var(--c70)' }}>{lang === 'bn' ? 'প্রিয় স্টেশন' : 'Favorite Stops'}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--cream)', marginTop: 4 }}>
                          {num(viewingUserDetails.stats?.totalFavoriteStops || 0, lang)}
                        </div>
                      </div>
                      <div style={{ background: 'var(--ground)', padding: '12px 14px', borderRadius: 6, border: '1px solid var(--line)' }}>
                        <div style={{ fontSize: 11.5, color: 'var(--c70)' }}>{lang === 'bn' ? 'যাত্রী রিপোর্ট' : 'Reports Filed'}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--cream)', marginTop: 4 }}>
                          {num(viewingUserDetails.stats?.totalIncidentReports || 0, lang)}
                        </div>
                      </div>
                    </div>

                    {/* Detailed User Attributes */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, fontSize: 13.5, fontFamily: 'var(--data)' }}>
                      <div style={{ background: 'var(--ground)', padding: 14, borderRadius: 6, border: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: 6, marginBottom: 6 }}>
                          <span style={{ color: 'var(--c70)' }}>{lang === 'bn' ? 'ডাটাবেজ ইউজার আইডি:' : 'Database User ID:'}</span>
                          <strong>#{viewingUserDetails.user.id}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: 6, marginBottom: 6 }}>
                          <span style={{ color: 'var(--c70)' }}>{lang === 'bn' ? 'পুরো নাম:' : 'Full Name:'}</span>
                          <strong>{viewingUserDetails.user.name}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: 6, marginBottom: 6 }}>
                          <span style={{ color: 'var(--c70)' }}>{lang === 'bn' ? 'ইমেইল অ্যাড্রেস:' : 'Email Address:'}</span>
                          <code>{viewingUserDetails.user.email}</code>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: 6, marginBottom: 6 }}>
                          <span style={{ color: 'var(--c70)' }}>{lang === 'bn' ? 'ফোন নম্বর:' : 'Phone Number:'}</span>
                          <span>{viewingUserDetails.user.phone || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--c70)' }}>{lang === 'bn' ? 'বায়ো / বিবরণ:' : 'Bio:'}</span>
                          <span>{viewingUserDetails.user.bio || '—'}</span>
                        </div>
                      </div>

                      <div style={{ background: 'var(--ground)', padding: 14, borderRadius: 6, border: '1px solid var(--line)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: 6, marginBottom: 6 }}>
                          <span style={{ color: 'var(--c70)' }}>{lang === 'bn' ? 'সিস্টেম রোল:' : 'System Role:'}</span>
                          <span style={{ textTransform: 'uppercase', fontWeight: 700, color: 'var(--metro)' }}>{viewingUserDetails.user.role}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: 6, marginBottom: 6 }}>
                          <span style={{ color: 'var(--c70)' }}>{lang === 'bn' ? 'অ্যাকাউন্ট স্ট্যাটাস:' : 'Account Status:'}</span>
                          <span style={{ fontWeight: 600, color: viewingUserDetails.user.status === 'active' ? 'var(--metro)' : 'var(--stamp)' }}>{viewingUserDetails.user.status}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: 6, marginBottom: 6 }}>
                          <span style={{ color: 'var(--c70)' }}>{lang === 'bn' ? 'রেজিস্ট্রেশন তারিখ:' : 'Registered On:'}</span>
                          <span>{formatDate(viewingUserDetails.user.createdAt, lang)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--line)', paddingBottom: 6, marginBottom: 6 }}>
                          <span style={{ color: 'var(--c70)' }}>{lang === 'bn' ? 'সর্বশেষ লগইন:' : 'Last Login:'}</span>
                          <span>{viewingUserDetails.user.lastLoginAt ? formatDate(viewingUserDetails.user.lastLoginAt, lang) : (lang === 'bn' ? 'তথ্য নেই' : 'N/A')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--c70)' }}>{lang === 'bn' ? 'কমিউটার লেভেল:' : 'Commuter Tier:'}</span>
                          <span style={{ color: 'var(--sev-3)', fontWeight: 600 }}>{viewingUserDetails.user.role === 'admin' ? 'System Administrator' : 'Dhaka Explorer'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                      <button
                        type="button"
                        className="action-chip"
                        onClick={() => {
                          const u = viewingUserDetails.user;
                          setEditingUser(u);
                          setEditUserForm({
                            name: u.name,
                            role: u.role,
                            status: u.status,
                            phone: u.phone || ''
                          });
                        }}
                      >
                        ✏️ {lang === 'bn' ? 'এই ব্যবহারকারী এডিট করুন' : 'Edit User Profile'}
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: USER'S SAVED ROUTES */}
                {userModalTab === 'routes' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 13, color: 'var(--c70)' }}>
                      {lang === 'bn'
                        ? `এই ব্যবহারকারীর দ্বারা সংরক্ষিত মোট ${num(viewingUserDetails.savedRoutes?.length || 0, lang)} টি রুট:`
                        : `Total ${viewingUserDetails.savedRoutes?.length || 0} routes saved by this commuter:`}
                    </div>

                    {(!viewingUserDetails.savedRoutes || viewingUserDetails.savedRoutes.length === 0) ? (
                      <div style={{ padding: '30px 14px', textAlign: 'center', background: 'var(--ground)', borderRadius: 6, color: 'var(--c70)' }}>
                        {lang === 'bn' ? 'এই ব্যবহারকারী এখনও কোনো রুট সংরক্ষণ করেননি।' : 'This commuter has not saved any routes yet.'}
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', background: 'var(--ground)', borderRadius: 6, border: '1px solid var(--line)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--data)' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--c70)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 10px' }}>ID</th>
                              <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'রুটের নাম' : 'Route Name'}</th>
                              <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'শুরু (Origin)' : 'Origin'}</th>
                              <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'গন্তব্য (Destination)' : 'Destination'}</th>
                              <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'মোড' : 'Mode'}</th>
                              <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'সময়' : 'Duration'}</th>
                              <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'তারিখ' : 'Saved On'}</th>
                              <th style={{ padding: '8px 10px', textAlign: 'right' }}>{lang === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewingUserDetails.savedRoutes.map((r) => (
                              <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                                <td style={{ padding: '8px 10px', color: 'var(--c70)' }}>#{r.id}</td>
                                <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--cream)' }}>
                                  🧭 {r.name}
                                </td>
                                <td style={{ padding: '8px 10px', color: 'var(--cream)' }}>📍 {r.fromLocation}</td>
                                <td style={{ padding: '8px 10px', color: 'var(--cream)' }}>🏁 {r.toLocation}</td>
                                <td style={{ padding: '8px 10px' }}>
                                  <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 11, background: 'var(--ground2)', color: 'var(--cream)', textTransform: 'uppercase' }}>
                                    {r.mode}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 10px', color: 'var(--metro)', fontWeight: 600 }}>
                                  {r.durationMinutes ? `${num(r.durationMinutes, lang)} min` : '—'}
                                </td>
                                <td style={{ padding: '8px 10px', color: 'var(--c70)', fontSize: 12 }}>
                                  {formatDate(r.createdAt, lang)}
                                </td>
                                <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                                  <button
                                    type="button"
                                    className="action-chip action-chip--logout"
                                    onClick={() => handleDeleteSavedRoute(r.id, r.name)}
                                    title={lang === 'bn' ? 'রুট মুছে ফেলুন' : 'Delete Route'}
                                    style={{ padding: '3px 8px', fontSize: 11 }}
                                  >
                                    🗑️
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: USER'S COMPLETED TRIPS */}
                {userModalTab === 'trips' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 13, color: 'var(--c70)' }}>
                      {lang === 'bn'
                        ? `এই ব্যবহারকারীর দ্বারা সম্পন্ন মোট ${num(viewingUserDetails.trips?.length || 0, lang)} টি ট্রিপ:`
                        : `Total ${viewingUserDetails.trips?.length || 0} trips logged by this commuter:`}
                    </div>

                    {(!viewingUserDetails.trips || viewingUserDetails.trips.length === 0) ? (
                      <div style={{ padding: '30px 14px', textAlign: 'center', background: 'var(--ground)', borderRadius: 6, color: 'var(--c70)' }}>
                        {lang === 'bn' ? 'এই ব্যবহারকারী এখনও কোনো ট্রিপ সম্পন্ন করেননি।' : 'No trips logged by this commuter yet.'}
                      </div>
                    ) : (
                      <div style={{ overflowX: 'auto', background: 'var(--ground)', borderRadius: 6, border: '1px solid var(--line)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, fontFamily: 'var(--data)' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--c70)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 10px' }}>ID</th>
                              <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'যাত্রা শুরু (From)' : 'Origin'}</th>
                              <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'গন্তব্য (To)' : 'Destination'}</th>
                              <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'মোড' : 'Mode'}</th>
                              <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'দূরত্ব' : 'Distance'}</th>
                              <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'সময়' : 'Duration'}</th>
                              <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {viewingUserDetails.trips.map((t) => (
                              <tr key={t.id} style={{ borderBottom: '1px solid var(--line)' }}>
                                <td style={{ padding: '8px 10px', color: 'var(--c70)' }}>#{t.id}</td>
                                <td style={{ padding: '8px 10px', color: 'var(--cream)', fontWeight: 600 }}>📍 {t.fromLocation}</td>
                                <td style={{ padding: '8px 10px', color: 'var(--cream)', fontWeight: 600 }}>🏁 {t.toLocation}</td>
                                <td style={{ padding: '8px 10px' }}>
                                  <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 11, background: 'var(--ground2)', color: 'var(--cream)', textTransform: 'uppercase' }}>
                                    {t.mode}
                                  </span>
                                </td>
                                <td style={{ padding: '8px 10px', color: 'var(--metro)', fontWeight: 600 }}>
                                  {t.distanceKm ? `${num(t.distanceKm, lang)} km` : '—'}
                                </td>
                                <td style={{ padding: '8px 10px', color: 'var(--cream)' }}>
                                  {t.durationMinutes ? `${num(t.durationMinutes, lang)} min` : '—'}
                                </td>
                                <td style={{ padding: '8px 10px', color: 'var(--c70)', fontSize: 12 }}>
                                  {formatDate(t.createdAt, lang)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: USER ACTIVITY TIMELINE */}
                {userModalTab === 'timeline' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 13, color: 'var(--c70)' }}>
                      {lang === 'bn'
                        ? `ব্যবহারকারীর সাম্প্রতিক সকল কার্যক্রম ও কর্মকাণ্ডের বিবরণী:`
                        : `Chronological activity stream of everything this user did:`}
                    </div>

                    {(!viewingUserDetails.activities || viewingUserDetails.activities.length === 0) ? (
                      <div style={{ padding: '30px 14px', textAlign: 'center', background: 'var(--ground)', borderRadius: 6, color: 'var(--c70)' }}>
                        {lang === 'bn' ? 'কোনো সাম্প্রতিক কার্যক্রম পাওয়া যায়নি।' : 'No recorded activity found for this user.'}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {viewingUserDetails.activities.map((act) => {
                          let icon = '⚡';
                          let tagColor = 'var(--cream)';
                          if (act.type.includes('login') || act.type.includes('auth')) {
                            icon = '🔑';
                            tagColor = 'var(--metro)';
                          } else if (act.type.includes('route')) {
                            icon = '🧭';
                            tagColor = '#38bdf8';
                          } else if (act.type.includes('trip')) {
                            icon = '🚗';
                            tagColor = 'var(--sev-3)';
                          } else if (act.type.includes('stop')) {
                            icon = '📍';
                            tagColor = '#f59e0b';
                          } else if (act.type.includes('incident')) {
                            icon = '📢';
                            tagColor = 'var(--stamp)';
                          } else if (act.type.includes('profile')) {
                            icon = '✏️';
                            tagColor = '#a855f7';
                          }

                          return (
                            <div
                              key={act.id}
                              style={{
                                background: 'var(--ground)',
                                padding: '12px 14px',
                                borderRadius: 6,
                                border: '1px solid var(--line)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 12
                              }}
                            >
                              <div style={{
                                width: 32,
                                height: 32,
                                borderRadius: 4,
                                background: 'var(--ground2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 16,
                                flexShrink: 0
                              }}>
                                {icon}
                              </div>

                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                                  <div style={{ fontWeight: 600, color: 'var(--cream)', fontSize: 13.5 }}>
                                    {act.title}
                                  </div>
                                  <span style={{ fontSize: 11.5, color: 'var(--c70)' }}>
                                    🕒 {formatDate(act.createdAt, lang)}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                  <span style={{
                                    padding: '1px 6px',
                                    borderRadius: 3,
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    background: 'var(--ground2)',
                                    color: tagColor
                                  }}>
                                    {act.type}
                                  </span>

                                  {act.details && Object.keys(act.details).length > 0 && (
                                    <span style={{ fontSize: 12, color: 'var(--c70)' }}>
                                      {act.details.from && act.details.to
                                        ? `(📍 ${act.details.from} ➔ 🏁 ${act.details.to} • ${act.details.mode || ''})`
                                        : (act.details.name ? `"${act.details.name}"` : '')
                                      }
                                    </span>
                                  )}

                                  {act.ipAddress && (
                                    <span style={{ fontSize: 11, color: 'var(--c45)', marginLeft: 'auto' }}>
                                      IP: {act.ipAddress}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Close Button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                  <button
                    type="button"
                    className="action-chip action-chip--highlight"
                    onClick={() => setViewingUserDetails(null)}
                    style={{ fontWeight: 700, padding: '8px 18px' }}
                  >
                    {lang === 'bn' ? 'সম্পন্ন (বন্ধ করুন)' : 'Done (Close)'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: 16
        }}>
          <div className="profile-card" style={{ maxWidth: 480, width: '100%', border: '1px solid var(--metro)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--cream)' }}>
                {lang === 'bn' ? 'ব্যবহারকারী এডিট করুন' : 'Edit User Profile & Role'}
              </h3>
              <button type="button" className="action-chip" onClick={() => setEditingUser(null)}>✕</button>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="profile-form-group">
                <label className="profile-form-label">{lang === 'bn' ? 'নাম' : 'Full Name'}</label>
                <input
                  type="text"
                  className="profile-form-input"
                  value={editUserForm.name}
                  onChange={(e) => setEditUserForm({ ...editUserForm, name: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="profile-form-group">
                  <label className="profile-form-label">{lang === 'bn' ? 'রোল (Role)' : 'Role'}</label>
                  <select
                    className="profile-form-input"
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                  >
                    <option value="user">User / Commuter</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div className="profile-form-group">
                  <label className="profile-form-label">{lang === 'bn' ? 'স্ট্যাটাস (Status)' : 'Status'}</label>
                  <select
                    className="profile-form-input"
                    value={editUserForm.status}
                    onChange={(e) => setEditUserForm({ ...editUserForm, status: e.target.value })}
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="banned">Banned</option>
                  </select>
                </div>
              </div>

              <div className="profile-form-group">
                <label className="profile-form-label">{lang === 'bn' ? 'মোবাইল নম্বর (ঐচ্ছিক)' : 'Phone (Optional)'}</label>
                <input
                  type="text"
                  className="profile-form-input"
                  value={editUserForm.phone}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                  placeholder="+8801700000000"
                />
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                <button type="button" className="action-chip" onClick={() => setEditingUser(null)}>
                  {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                </button>
                <button type="submit" className="action-chip action-chip--highlight" style={{ fontWeight: 700 }}>
                  {lang === 'bn' ? '✓ সংরক্ষণ করুন' : '✓ Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Admin Modal */}
      {showInviteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20
        }}>
          <div className="profile-card" style={{ maxWidth: 540, width: '100%', padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', background: 'var(--ground-card, var(--ground))', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{inviteResult ? '🎉' : '✉️'}</span>
                <span>
                  {inviteResult
                    ? (lang === 'bn' ? 'ইনভাইটেশন সম্পন্ন হয়েছে!' : 'Invitation Processed Successfully!')
                    : (lang === 'bn' ? 'নতুন অ্যাডমিন ইনভাইটেশন' : 'Invite Administrator / Staff')}
                </span>
              </h3>
              <button
                type="button"
                className="header-icon-btn"
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteResult(null);
                  setInviteForm({ email: '', name: '', role: 'admin', tempPassword: '' });
                }}
                style={{ width: 28, height: 28, fontSize: 16 }}
              >
                ✕
              </button>
            </div>

            {inviteResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{
                  padding: 14,
                  borderRadius: 8,
                  background: inviteResult.emailDelivered ? 'rgba(0, 200, 83, 0.12)' : 'rgba(255, 193, 7, 0.12)',
                  border: `1px solid ${inviteResult.emailDelivered ? '#00c853' : '#ffc107'}`,
                  color: 'var(--cream)',
                  fontSize: 13,
                  lineHeight: 1.5
                }}>
                  {inviteResult.emailDelivered ? (
                    <div>
                      <strong>✅ {lang === 'bn' ? 'ইমেইল সফলভাবে পাঠানো হয়েছে!' : 'Email Sent Successfully!'}</strong>
                      <p style={{ margin: '4px 0 0', color: 'var(--c70)' }}>
                        {lang === 'bn'
                          ? `লগইন নির্দেশাবলী সহ আমন্ত্রণপত্র সরাসরি "${inviteResult.user?.email || inviteForm.email}" ঠিকানায় পৌঁছে দেওয়া হয়েছে।`
                          : `Login credentials and instructions have been delivered to "${inviteResult.user?.email || inviteForm.email}".`}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <strong>⚠️ {lang === 'bn' ? 'অ্যাকাউন্ট তৈরি হয়েছে (অফলাইন / মক মোড)' : 'Account Created (Mock / Offline Mode)'}</strong>
                      <p style={{ margin: '4px 0 0', color: 'var(--c70)' }}>
                        {lang === 'bn'
                          ? 'সার্ভারে লাইভ ইমেইল ডিসপ্যাচ বন্ধ থাকায় নিচের ক্রেডেনশিয়াল কপি করে নতুন অ্যাডমিনকে সরাসরি প্রদান করুন।'
                          : 'Live SMTP is disabled or in mock mode. Please copy the temporary credentials below and share them with the user.'}
                      </p>
                    </div>
                  )}
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--c60)' }}>{lang === 'bn' ? 'নাম:' : 'Name:'}</span>
                    <strong style={{ color: 'var(--cream)' }}>{inviteResult.user?.name || inviteForm.name || '—'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--c60)' }}>{lang === 'bn' ? 'ইমেইল:' : 'Email:'}</span>
                    <strong style={{ color: 'var(--cream)' }}>{inviteResult.user?.email || inviteForm.email}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--c60)' }}>{lang === 'bn' ? 'রোল:' : 'Role:'}</span>
                    <span className={`status-pill ${inviteResult.user?.role === 'admin' ? 'sp-resolved' : 'sp-active'}`}>
                      {inviteResult.user?.role === 'admin' ? 'Administrator' : 'Moderator'}
                    </span>
                  </div>

                  {inviteResult.tempPassword && (
                    <div style={{ marginTop: 8, paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
                      <span style={{ fontSize: 12, color: 'var(--c60)', display: 'block', marginBottom: 4 }}>
                        {lang === 'bn' ? 'টেম্পোরারি পাসওয়ার্ড:' : 'Temporary Password:'}
                      </span>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid var(--line)'
                      }}>
                        <code style={{ fontSize: 14, color: '#38ef7d', fontWeight: 600, letterSpacing: '0.05em' }}>
                          {inviteResult.tempPassword}
                        </code>
                        <button
                          type="button"
                          className="action-chip"
                          onClick={() => {
                            navigator.clipboard.writeText(`Email: ${inviteResult.user?.email || inviteForm.email}\nPassword: ${inviteResult.tempPassword}\nPortal: ${window.location.origin}/login`);
                            setCopiedCreds(true);
                            setTimeout(() => setCopiedCreds(false), 2500);
                          }}
                          style={{ fontSize: 12, padding: '4px 10px', height: 'auto' }}
                        >
                          {copiedCreds ? '✓ ' + (lang === 'bn' ? 'কপি হয়েছে' : 'Copied') : '📋 ' + (lang === 'bn' ? 'ক্রেডেনশিয়াল কপি' : 'Copy All')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    type="button"
                    className="action-chip"
                    onClick={() => {
                      setInviteResult(null);
                      setInviteForm({ email: '', name: '', role: 'admin', tempPassword: '' });
                    }}
                  >
                    {lang === 'bn' ? '+ আরও ইনভাইট করুন' : '+ Invite Another'}
                  </button>
                  <button
                    type="button"
                    className="hero-btn-primary"
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteResult(null);
                      setInviteForm({ email: '', name: '', role: 'admin', tempPassword: '' });
                    }}
                    style={{ fontSize: 14, padding: '8px 20px' }}
                  >
                    {lang === 'bn' ? 'সম্পন্ন' : 'Done'}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleInviteAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p className="t-body" style={{ color: 'var(--c70)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                  {lang === 'bn'
                    ? 'টিম মেম্বারকে ইমেইলের মাধ্যমে অ্যাডমিন বা মডারেটর হিসেবে যুক্ত করুন। ইনভাইটেশন ও লগইন ক্রেডেনশিয়াল সরাসরি সংরক্ষিত ও প্রেরিত হবে।'
                    : 'Invite a team member via email to manage transit networks, live disruptions, and commuters.'}
                </p>

                <div>
                  <label className="profile-form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    {lang === 'bn' ? 'ইমেইল অ্যাড্রেস *' : 'Email Address *'}
                  </label>
                  <input
                    type="email"
                    required
                    className="profile-form-input"
                    placeholder="colleague@example.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label className="profile-form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    {lang === 'bn' ? 'নাম (ঐচ্ছিক)' : 'Full Name (Optional)'}
                  </label>
                  <input
                    type="text"
                    className="profile-form-input"
                    placeholder={lang === 'bn' ? 'যেমন: আরিফুর রহমান' : 'e.g. Arifur Rahman'}
                    value={inviteForm.name}
                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label className="profile-form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    {lang === 'bn' ? 'অ্যাডমিন রোল ও অধিকার' : 'Role & Privileges'}
                  </label>
                  <select
                    className="profile-form-input"
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="admin">
                      {lang === 'bn' ? 'Administrator (সম্পূর্ণ সিস্টেম, নোড, রুট ও ব্যবহারকারী নিয়ন্ত্রণ)' : 'Administrator (Full System, Nodes, Routes & Users Control)'}
                    </option>
                    <option value="moderator">
                      {lang === 'bn' ? 'Moderator (লাইভ যানজট ব্রডকাস্ট ও যাত্রী রিপোর্ট তদারকি)' : 'Moderator (Live Congestion Broadcasts & Passenger Reports)'}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="profile-form-label" style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                    {lang === 'bn' ? 'কাস্টম পাসওয়ার্ড (ঐচ্ছিক)' : 'Custom Initial Password (Optional)'}
                  </label>
                  <input
                    type="text"
                    className="profile-form-input"
                    placeholder={lang === 'bn' ? 'ফাঁকা রাখলে স্বয়ংক্রিয়ভাবে তৈরি হবে' : 'Leave blank to auto-generate'}
                    value={inviteForm.tempPassword}
                    onChange={(e) => setInviteForm({ ...inviteForm, tempPassword: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                  <button
                    type="button"
                    className="action-chip"
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteForm({ email: '', name: '', role: 'admin', tempPassword: '' });
                    }}
                  >
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="hero-btn-primary"
                    disabled={inviting || !inviteForm.email}
                    style={{ fontSize: 14, padding: '8px 18px' }}
                  >
                    {inviting
                      ? (lang === 'bn' ? 'ইনভাইট পাঠানো হচ্ছে...' : 'Sending Invite...')
                      : (lang === 'bn' ? '✉️ ইনভাইট পাঠান' : '✉️ Send Invitation')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
