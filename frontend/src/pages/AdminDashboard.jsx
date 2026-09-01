import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminOverview,
  getAdminUsers,
  getAdminGuests,
  getAdminSavedRoutes,
  updateAdminUser,
  deleteAdminUser,
  getAdminNodes,
  createAdminNode,
  updateAdminNode,
  deleteAdminNode,
  getAdminEdges,
  createAdminEdge,
  updateAdminEdge,
  deleteAdminEdge,
  getAdminAnomalies,
  broadcastAdminAnomaly,
  resolveAdminAnomaly,
  getAdminIncidents,
  updateAdminIncidentStatus,
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

const MRT6_STATIONS_LIST = [
  'mrt_uttara_north', 'mrt_uttara_center', 'mrt_uttara_south', 'mrt_pallabi',
  'mrt_mirpur_11', 'mrt_mirpur_10', 'mrt_kazipara', 'mrt_shewrapara',
  'mrt_agargaon', 'mrt_bijoy_sarani', 'mrt_farmgate', 'mrt_karwan_bazar',
  'mrt_shahbagh', 'mrt_dhaka_university', 'mrt_secretariat', 'mrt_motijheel'
];

export function AdminDashboard({ authUser }) {
  const { lang } = useLanguage();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [userSubTab, setUserSubTab] = useState('users'); // 'users' or 'guests'
  const [networkSubTab, setNetworkSubTab] = useState('nodes');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Overview Data
  const [overview, setOverview] = useState(null);

  // Users Data
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', role: 'user', status: 'active', phone: '' });

  // Guests Data
  const [guests, setGuests] = useState([]);
  const [guestTotal, setGuestTotal] = useState(0);
  const [guestSearch, setGuestSearch] = useState('');

  // Saved Routes Data
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [savedRouteTotal, setSavedRouteTotal] = useState(0);
  const [savedRouteSearch, setSavedRouteSearch] = useState('');
  const [savedRouteModeFilter, setSavedRouteModeFilter] = useState('');

  // Network Nodes & Edges Data
  const [nodes, setNodes] = useState([]);
  const [nodeSearch, setNodeSearch] = useState('');
  const [nodeTypeFilter, setNodeTypeFilter] = useState('');
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [nodeForm, setNodeForm] = useState({ id: '', nameBn: '', nameEn: '', lat: 23.8103, lng: 90.4125, type: 'metro_station' });

  const [edges, setEdges] = useState([]);
  const [edgeModeFilter, setEdgeModeFilter] = useState('');
  const [showAddEdgeModal, setShowAddEdgeModal] = useState(false);
  const [edgeForm, setEdgeForm] = useState({ fromNode: 'mrt_mirpur_10', toNode: 'mrt_farmgate', mode: 'metro', baseMinutes: 12, fareTaka: 30 });

  // Anomalies Data
  const [anomalies, setAnomalies] = useState([]);
  const [anomalyFilter, setAnomalyFilter] = useState('');
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [anomalyForm, setAnomalyForm] = useState({
    type: 'waterlogging',
    reason: '',
    durationMinutes: 60,
    multiplier: 1.8,
    affectedFrom: 'mrt_kazipara',
    affectedTo: 'mrt_shewrapara'
  });

  // Incidents Data
  const [incidents, setIncidents] = useState([]);
  const [incidentStatusFilter, setIncidentStatusFilter] = useState('');

  // Settings Data
  const [settings, setSettings] = useState(null);
  const [settingsForm, setSettingsForm] = useState({
    brtaBusBase: 10,
    brtaBusPerKm: 2.5,
    cngBase: 50,
    cngPerKm: 15,
    rickshawBase: 25,
    rickshawPerKm: 20,
    minSavingMinutes: 12,
    cooldownMinutes: 10,
    maintenanceMode: false,
    bannerBn: '',
    bannerEn: ''
  });

  // Audit Logs Data
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
      if (activeTab === 'overview') {
        const data = await getAdminOverview();
        setOverview(data);
      } else if (activeTab === 'users') {
        if (userSubTab === 'users') {
          const data = await getAdminUsers({
            query: userSearch,
            role: userRoleFilter,
            status: userStatusFilter
          });
          setUsers(data.users || []);
          setUserTotal(data.total || 0);
        } else {
          const data = await getAdminGuests({ query: guestSearch });
          setGuests(data.guests || []);
          setGuestTotal(data.total || 0);
        }
      } else if (activeTab === 'saved_routes') {
        const data = await getAdminSavedRoutes({
          search: savedRouteSearch,
          mode: savedRouteModeFilter
        });
        setSavedRoutes(data.routes || []);
        setSavedRouteTotal(data.total || 0);
      } else if (activeTab === 'network') {
        if (networkSubTab === 'nodes') {
          const data = await getAdminNodes({ search: nodeSearch, type: nodeTypeFilter });
          setNodes(data || []);
        } else {
          const data = await getAdminEdges({ mode: edgeModeFilter });
          setEdges(data || []);
        }
      } else if (activeTab === 'anomalies') {
        const data = await getAdminAnomalies({ status: anomalyFilter });
        setAnomalies(data || []);
      } else if (activeTab === 'incidents') {
        const data = await getAdminIncidents({ status: incidentStatusFilter });
        setIncidents(data || []);
      } else if (activeTab === 'settings') {
        const [settingsData, logsData] = await Promise.all([
          getAdminSettings().catch(() => ({})),
          getAdminAuditLogs({ limit: 40 }).catch(() => [])
        ]);
        setSettings(settingsData);
        setAuditLogs(logsData || []);

        if (settingsData?.fare_rules?.value) {
          const fr = settingsData.fare_rules.value;
          const at = settingsData.alert_thresholds?.value || {};
          const ss = settingsData.system_status?.value || {};
          setSettingsForm({
            brtaBusBase: fr.brta_bus_base_taka ?? 10,
            brtaBusPerKm: fr.brta_bus_per_km ?? 2.5,
            cngBase: fr.cng_base_taka ?? 50,
            cngPerKm: fr.cng_per_km ?? 15,
            rickshawBase: fr.rickshaw_base_taka ?? 25,
            rickshawPerKm: fr.rickshaw_per_km ?? 20,
            minSavingMinutes: at.min_saving_minutes ?? 12,
            cooldownMinutes: at.cooldown_minutes ?? 10,
            maintenanceMode: Boolean(ss.maintenance_mode),
            bannerBn: ss.active_broadcast_banner_bn || '',
            bannerEn: ss.active_broadcast_banner_en || ''
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
  }, [activeTab, userSubTab, networkSubTab, userRoleFilter, userStatusFilter, nodeTypeFilter, edgeModeFilter, anomalyFilter, incidentStatusFilter, savedRouteModeFilter]);

  // Debounced search
  useEffect(() => {
    if (activeTab === 'users') {
      const timer = setTimeout(() => loadDashboardData(true), 350);
      return () => clearTimeout(timer);
    }
  }, [userSearch, guestSearch]);

  useEffect(() => {
    if (activeTab === 'saved_routes') {
      const timer = setTimeout(() => loadDashboardData(true), 350);
      return () => clearTimeout(timer);
    }
  }, [savedRouteSearch]);

  useEffect(() => {
    if (activeTab === 'network' && networkSubTab === 'nodes') {
      const timer = setTimeout(() => loadDashboardData(true), 350);
      return () => clearTimeout(timer);
    }
  }, [nodeSearch]);

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

  // Edge Actions
  const handleCreateEdge = async (e) => {
    e.preventDefault();
    try {
      await createAdminEdge({
        fromNode: edgeForm.fromNode,
        toNode: edgeForm.toNode,
        mode: edgeForm.mode,
        baseMinutes: Number(edgeForm.baseMinutes),
        fareTaka: Number(edgeForm.fareTaka)
      });
      showToast(lang === 'bn' ? 'রুট সংযোগ যুক্ত করা হয়েছে।' : 'Route connection added.');
      setShowAddEdgeModal(false);
      loadDashboardData(true);
    } catch (err) {
      showError(err.message);
    }
  };

  const handleDeleteEdge = async (edgeId) => {
    if (!window.confirm(lang === 'bn' ? 'এই রুট এজটি ডিলিট করতে চান?' : 'Delete this route edge?')) return;
    try {
      await deleteAdminEdge(edgeId);
      showToast(lang === 'bn' ? 'রুট এজ ডিলিট করা হয়েছে।' : 'Route edge deleted.');
      loadDashboardData(true);
    } catch (err) {
      showError(err.message);
    }
  };

  // Anomaly Actions
  const handleBroadcastAnomaly = async (e) => {
    e.preventDefault();
    if (!anomalyForm.reason.trim()) {
      showError(lang === 'bn' ? 'ডিজরাপশনের কারণ উল্লেখ করুন।' : 'Reason is required.');
      return;
    }

    try {
      await broadcastAdminAnomaly({
        type: anomalyForm.type,
        reason: anomalyForm.reason,
        durationMinutes: Number(anomalyForm.durationMinutes),
        affectedEdges: [
          {
            from: anomalyForm.affectedFrom,
            to: anomalyForm.affectedTo,
            multiplier: Number(anomalyForm.multiplier)
          }
        ]
      });
      showToast(lang === 'bn' ? 'লাইভ ট্রাফিক ডিজরাপশন ব্রডকাস্ট করা হয়েছে।' : 'Live anomaly broadcasted successfully!');
      setShowBroadcastModal(false);
      setAnomalyForm({
        type: 'waterlogging',
        reason: '',
        durationMinutes: 60,
        multiplier: 1.8,
        affectedFrom: 'mrt_kazipara',
        affectedTo: 'mrt_shewrapara'
      });
      loadDashboardData(true);
    } catch (err) {
      showError(err.message);
    }
  };

  const handleResolveAnomaly = async (anomalyId) => {
    try {
      await resolveAdminAnomaly(anomalyId);
      showToast(lang === 'bn' ? 'ডিজরাপশন অ্যালার্ট সমাধান করা হয়েছে।' : 'Disruption alert resolved.');
      loadDashboardData(true);
    } catch (err) {
      showError(err.message);
    }
  };

  // Incident Actions
  const handleUpdateIncident = async (incidentId, newStatus) => {
    try {
      await updateAdminIncidentStatus(incidentId, { status: newStatus });
      showToast(lang === 'bn' ? `রিপোর্টের স্ট্যাটাস "${newStatus}" করা হয়েছে।` : `Incident report marked as ${newStatus}.`);
      loadDashboardData(true);
    } catch (err) {
      showError(err.message);
    }
  };

  // Settings Actions
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await Promise.all([
        updateAdminSetting('fare_rules', {
          value: {
            brta_bus_base_taka: Number(settingsForm.brtaBusBase),
            brta_bus_per_km: Number(settingsForm.brtaBusPerKm),
            cng_base_taka: Number(settingsForm.cngBase),
            cng_per_km: Number(settingsForm.cngPerKm),
            rickshaw_base_taka: Number(settingsForm.rickshawBase),
            rickshaw_per_km: Number(settingsForm.rickshawPerKm)
          },
          description: 'BRTA & local transit fare calculation parameters'
        }),
        updateAdminSetting('alert_thresholds', {
          value: {
            min_saving_minutes: Number(settingsForm.minSavingMinutes),
            cooldown_minutes: Number(settingsForm.cooldownMinutes),
            anomaly_multiplier_threshold: 1.4
          },
          description: 'Commuter departure & route anomaly notification rules'
        }),
        updateAdminSetting('system_status', {
          value: {
            maintenance_mode: Boolean(settingsForm.maintenanceMode),
            active_broadcast_banner_bn: settingsForm.bannerBn,
            active_broadcast_banner_en: settingsForm.bannerEn
          },
          description: 'System maintenance state and live broadcast banner message'
        })
      ]);

      showToast(lang === 'bn' ? 'সিস্টেম সেটিংস সফলভাবে সংরক্ষিত হয়েছে।' : 'System settings saved successfully.');
      loadDashboardData(true);
    } catch (err) {
      showError(err.message);
    }
  };

  const TAB_ITEMS = [
    { id: 'overview', bn: 'সারসংক্ষেপ', en: 'Overview', icon: '📊' },
    { id: 'users', bn: 'ইউজার ও গেস্ট লগইন', en: 'Users & Guests', icon: '👥' },
    { id: 'saved_routes', bn: 'সংরক্ষিত রুটসমূহ', en: 'Saved Routes', icon: '🧭' },
    { id: 'network', bn: 'ট্রানজিট নোড ও রুট', en: 'Transit Network', icon: '🚇' },
    { id: 'anomalies', bn: 'জ্যাম ও ডিজরাপশন', en: 'Live Anomalies', icon: '⚠️' },
    { id: 'incidents', bn: 'যাত্রীদের রিপোর্ট', en: 'Incident Reports', icon: '📢' },
    { id: 'settings', bn: 'অডিট ও সেটিংস', en: 'Audit & Settings', icon: '⚙️' }
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
        {/* Header Banner */}
        <div className="profile-header-card" style={{ borderLeft: '4px solid var(--metro)' }}>
          <div className="profile-header-main">
            <div className="profile-avatar" style={{ background: 'var(--ground)', border: '2px solid var(--metro)', color: 'var(--metro)', fontSize: 26 }}>
              🛡️
            </div>
            <div className="profile-user-info">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <h1 className="profile-user-name" style={{ fontSize: 24 }}>
                  {lang === 'bn' ? 'অ্যাডমিন কমান্ড সেন্টার' : 'Transit Admin Command Center'}
                </h1>
                <span className="profile-user-badge-guest" style={{ background: 'rgba(39, 185, 122, 0.15)', color: 'var(--metro)', borderColor: 'var(--metro)', textTransform: 'uppercase', letterSpacing: 1 }}>
                  {authUser?.email?.toLowerCase() === 'turjo5892@gmail.com' ? 'SUPER ADMIN (Turjo)' : (authUser?.role === 'admin' ? 'SUPER ADMIN' : 'MODERATOR')}
                </span>
              </div>
              <p className="profile-user-email" style={{ margin: '4px 0 0', color: 'var(--c70)' }}>
                {lang === 'bn' ? `লগইনকৃত অ্যাডমিন: ${authUser?.email || 'Turjo5892@gmail.com'} • সম্পূর্ণ ডেটাবেজ ও ট্রানজিট নেটওয়ার্ক নিয়ন্ত্রণ` : `Signed in as ${authUser?.email || 'Turjo5892@gmail.com'} • Full database and transit network control`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14 }}>
            <button
              type="button"
              className="action-chip"
              onClick={() => loadDashboardData(true)}
              disabled={refreshing}
              style={{ fontWeight: 600 }}
            >
              {refreshing ? '⟳ Refreshing...' : (lang === 'bn' ? '🔄 রিফ্রেশ' : '🔄 Refresh')}
            </button>
            <button
              type="button"
              className="action-chip action-chip--highlight"
              onClick={() => {
                setActiveTab('anomalies');
                setShowBroadcastModal(true);
              }}
              style={{ fontWeight: 700 }}
            >
              {lang === 'bn' ? '+ ডিজরাপশন ব্রডকাস্ট' : '+ Broadcast Alert'}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="profile-tabs-nav" style={{ display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 6 }}>
          {TAB_ITEMS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`profile-tab-btn ${activeTab === tab.id ? 'profile-tab-btn--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>{tab.icon}</span>
              <span>{lang === 'bn' ? tab.bn : tab.en}</span>
            </button>
          ))}
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
            {/* ----------------- TAB 1: OVERVIEW ----------------- */}
            {activeTab === 'overview' && overview && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 16 }}>
                {/* Metric Summary Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 14
                }}>
                  <div className="profile-stat-card">
                    <div className="profile-stat-icon">👥</div>
                    <div className="profile-stat-number">{num(overview.users.total, lang)}</div>
                    <div className="profile-stat-label">
                      {lang === 'bn' ? `মোট ইউজার (${num(overview.users.guests, lang)} গেস্ট)` : `Total Users (${overview.users.guests} Guests)`}
                    </div>
                  </div>

                  <div className="profile-stat-card">
                    <div className="profile-stat-icon">🧭</div>
                    <div className="profile-stat-number">{num(overview.savedRoutes?.total || 0, lang)}</div>
                    <div className="profile-stat-label">
                      {lang === 'bn' ? 'সংরক্ষিত যাত্রার রুট' : 'Commuter Saved Routes'}
                    </div>
                  </div>

                  <div className="profile-stat-card">
                    <div className="profile-stat-icon">🚇</div>
                    <div className="profile-stat-number">{num(overview.nodes.total, lang)}</div>
                    <div className="profile-stat-label">
                      {lang === 'bn' ? `ট্রানজিট নোড (${num(overview.nodes.metroStations, lang)} মেট্রো)` : `Transit Nodes (${overview.nodes.metroStations} MRT-6)`}
                    </div>
                  </div>

                  <div className="profile-stat-card" style={{ borderColor: overview.anomalies.active > 0 ? 'var(--stamp)' : 'var(--line)' }}>
                    <div className="profile-stat-icon">⚠️</div>
                    <div className="profile-stat-number" style={{ color: overview.anomalies.active > 0 ? 'var(--stamp)' : 'var(--cream)' }}>
                      {num(overview.anomalies.active, lang)}
                    </div>
                    <div className="profile-stat-label">
                      {lang === 'bn' ? 'সক্রিয় ট্রাফিক ডিজরাপশন' : 'Active Live Disruptions'}
                    </div>
                  </div>

                  <div className="profile-stat-card">
                    <div className="profile-stat-icon">📢</div>
                    <div className="profile-stat-number" style={{ color: overview.incidents.pending > 0 ? 'var(--sev-3)' : 'var(--cream)' }}>
                      {num(overview.incidents.pending, lang)}
                    </div>
                    <div className="profile-stat-label">
                      {lang === 'bn' ? 'অমীমাংসিত যাত্রী রিপোর্ট' : 'Pending Incident Reports'}
                    </div>
                  </div>

                  <div className="profile-stat-card">
                    <div className="profile-stat-icon">⚡</div>
                    <div className="profile-stat-number">{num(overview.edges.total, lang)}</div>
                    <div className="profile-stat-label">
                      {lang === 'bn' ? 'গ্রাফ নেটওয়ার্ক এজ' : 'Graph Network Edges'}
                    </div>
                  </div>
                </div>

                {/* Mode Breakdown & Corridors Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                  {/* Transit Mode Share Card */}
                  <div className="profile-card">
                    <h3 style={{ margin: '0 0 14px', fontSize: 16, color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span>🚊</span>
                      <span>{lang === 'bn' ? 'ঢাকা ট্রানজিট মোড ডিস্ট্রিবিউশন' : 'Dhaka Transit Mode Graph Coverage'}</span>
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { mode: 'metro', nameBn: 'মেট্রোরেল (MRT-6)', nameEn: 'Metro (MRT-6)', color: 'var(--mode-metro)', count: 30 },
                        { mode: 'bus', nameBn: 'পাবলিক বাস (BRTA)', nameEn: 'Public Bus (BRTA)', color: 'var(--mode-bus)', count: 18 },
                        { mode: 'cng', nameBn: 'সিএনজি অটো-রিকশা', nameEn: 'CNG Auto-rickshaw', color: 'var(--mode-cng)', count: 14 },
                        { mode: 'rickshaw', nameBn: 'সাইকেল ও রিকশা', nameEn: 'Rickshaw & Cycle', color: 'var(--mode-rickshaw)', count: 10 },
                        { mode: 'walk', nameBn: 'হাঁটা (Walkway)', nameEn: 'Walking / Access', color: 'var(--mode-walk)', count: 8 }
                      ].map((item) => (
                        <div key={item.mode}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4, color: 'var(--cream)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                              {lang === 'bn' ? item.nameBn : item.nameEn}
                            </span>
                            <span style={{ fontFamily: 'var(--data)', color: 'var(--c70)' }}>
                              {num(item.count, lang)} {lang === 'bn' ? 'রুট' : 'routes'}
                            </span>
                          </div>
                          <div style={{ height: 6, background: 'var(--ground2)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(100, item.count * 3)}%`, height: '100%', background: item.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Active Disruptions & System Status */}
                  <div className="profile-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <h3 style={{ margin: 0, fontSize: 16, color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>⚠️</span>
                        <span>{lang === 'bn' ? 'সাম্প্রতিক ট্রাফিক ডিজরাপশন' : 'Recent Disruption Feeds'}</span>
                      </h3>
                      <button
                        type="button"
                        className="action-chip"
                        onClick={() => setActiveTab('anomalies')}
                        style={{ fontSize: 12 }}
                      >
                        {lang === 'bn' ? 'সব দেখুন →' : 'View All →'}
                      </button>
                    </div>

                    {overview.anomalies.recent.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--c70)' }}>
                        <p style={{ margin: 0 }}>✓ {lang === 'bn' ? 'বর্তমানে কোনো সক্রিয় ডিজরাপশন নেই' : 'No active disruptions reported'}</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {overview.anomalies.recent.slice(0, 4).map((a) => (
                          <div key={a.id} style={{
                            padding: '10px 12px',
                            background: 'var(--ground2)',
                            borderRadius: 4,
                            borderLeft: `3px solid ${a.status === 'active' ? 'var(--stamp)' : 'var(--metro)'}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--cream)' }}>
                                {a.reason}
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--c70)', marginTop: 2 }}>
                                {a.type} • {formatDate(a.starts_at || a.created_at, lang)}
                              </div>
                            </div>
                            <span style={{
                              fontSize: 11,
                              padding: '2px 8px',
                              borderRadius: 3,
                              background: a.status === 'active' ? 'rgba(168, 56, 42, 0.2)' : 'rgba(39, 185, 122, 0.2)',
                              color: a.status === 'active' ? 'var(--stamp)' : 'var(--metro)',
                              fontWeight: 600
                            }}>
                              {a.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- TAB 2: USERS & GUESTS ----------------- */}
            {activeTab === 'users' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                {/* Sub-tab switcher: Regular Registered Users vs Guest Logins */}
                <div style={{ display: 'flex', gap: 8 }}>
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
                                    {(u.email === 'turjo5892@gmail.com' || u.email === 'turjo582@gmail.com') && (
                                      <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--metro)', color: '#fff', padding: '1px 5px', borderRadius: 3 }}>
                                        MAIN ADMIN
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
                                  <button
                                    type="button"
                                    className="action-chip action-chip--logout"
                                    onClick={() => handleDeleteUser(g.id, g.email)}
                                    style={{ padding: '3px 8px', fontSize: 12 }}
                                  >
                                    🗑️ {lang === 'bn' ? 'মুছুন' : 'Delete'}
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </>
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
              </div>
            )}

            {/* ----------------- TAB 3: SAVED ROUTES ----------------- */}
            {activeTab === 'saved_routes' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                {/* Search & Mode Filter */}
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

                  <div style={{ fontSize: 13, color: 'var(--c70)', marginLeft: 'auto' }}>
                    {lang === 'bn' ? `মোট ${num(savedRouteTotal, lang)} টি সংরক্ষিত রুট` : `Total Saved Routes: ${savedRouteTotal}`}
                  </div>
                </div>

                {/* Saved Routes Table */}
                <div className="profile-card" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, fontFamily: 'var(--data)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--c70)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px' }}>ID</th>
                        <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'রুটের নাম' : 'Route Name'}</th>
                        <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'সংরক্ষণকারী যাত্রী' : 'Saved By Commuter'}</th>
                        <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'শুরু (Origin)' : 'Origin'}</th>
                        <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'গন্তব্য (Destination)' : 'Destination'}</th>
                        <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'মোড' : 'Mode'}</th>
                        <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'সময় (মিনিট)' : 'Duration'}</th>
                        <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'সংরক্ষণ তারিখ' : 'Saved On'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedRoutes.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--c70)' }}>
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
                              <div style={{ fontWeight: 600, color: 'var(--cream)' }}>{r.userName}</div>
                              <div style={{ fontSize: 12, color: 'var(--c70)' }}>{r.userEmail}</div>
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
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ----------------- TAB 4: TRANSIT NETWORK & NODES ----------------- */}
            {activeTab === 'network' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                {/* Sub-tab selector */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className={`action-chip ${networkSubTab === 'nodes' ? 'action-chip--highlight' : ''}`}
                      onClick={() => setNetworkSubTab('nodes')}
                      style={{ fontWeight: 700 }}
                    >
                      🚇 {lang === 'bn' ? 'ট্রানজিট স্টেশন ও নোড' : 'Stations & Nodes'} ({num(nodes.length, lang)})
                    </button>
                    <button
                      type="button"
                      className={`action-chip ${networkSubTab === 'edges' ? 'action-chip--highlight' : ''}`}
                      onClick={() => setNetworkSubTab('edges')}
                      style={{ fontWeight: 700 }}
                    >
                      ⚡ {lang === 'bn' ? 'রুট ও সংযোগ এজ' : 'Route Graph Edges'} ({num(edges.length, lang)})
                    </button>
                  </div>

                  {networkSubTab === 'nodes' ? (
                    <button
                      type="button"
                      className="action-chip action-chip--highlight"
                      onClick={() => setShowAddNodeModal(true)}
                      style={{ fontWeight: 700 }}
                    >
                      + {lang === 'bn' ? 'নতুন নোড যোগ করুন' : 'Add Station / Node'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="action-chip action-chip--highlight"
                      onClick={() => setShowAddEdgeModal(true)}
                      style={{ fontWeight: 700 }}
                    >
                      + {lang === 'bn' ? 'নতুন রুট এজ যোগ করুন' : 'Add Route Edge'}
                    </button>
                  )}
                </div>

                {/* NODES SUB-VIEW */}
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
                        <option value="metro_station">Metro Station</option>
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

                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 8 }}>
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

                {/* EDGES SUB-VIEW */}
                {networkSubTab === 'edges' && (
                  <div className="profile-card" style={{ overflowX: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <select
                        className="profile-form-input"
                        style={{ width: 'auto', minWidth: 160 }}
                        value={edgeModeFilter}
                        onChange={(e) => setEdgeModeFilter(e.target.value)}
                      >
                        <option value="">{lang === 'bn' ? 'সকল মোড' : 'All Modes'}</option>
                        <option value="metro">Metro</option>
                        <option value="bus">Bus</option>
                        <option value="cng">CNG</option>
                        <option value="rickshaw">Rickshaw</option>
                        <option value="walk">Walk</option>
                      </select>
                      <span style={{ fontSize: 12, color: 'var(--c70)' }}>
                        {num(edges.length, lang)} {lang === 'bn' ? 'সংযোগ' : 'connections'}
                      </span>
                    </div>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, fontFamily: 'var(--data)' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--c70)', textAlign: 'left' }}>
                          <th style={{ padding: '8px 10px' }}>ID</th>
                          <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'শুরু (From)' : 'From Node'}</th>
                          <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'গন্তব্য (To)' : 'To Node'}</th>
                          <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'মোড' : 'Mode'}</th>
                          <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'সময় (মিনিট)' : 'Base Min'}</th>
                          <th style={{ padding: '8px 10px' }}>{lang === 'bn' ? 'ভাড়া (টাকা)' : 'Fare (৳)'}</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right' }}>{lang === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {edges.map((e) => (
                          <tr key={e.id} style={{ borderBottom: '1px solid var(--line)' }}>
                            <td style={{ padding: '8px 10px', color: 'var(--c70)' }}>#{e.id}</td>
                            <td style={{ padding: '8px 10px', color: 'var(--cream)', fontWeight: 600 }}>
                              {lang === 'bn' ? e.fromNodeNameBn : e.fromNodeNameEn}
                            </td>
                            <td style={{ padding: '8px 10px', color: 'var(--cream)', fontWeight: 600 }}>
                              {lang === 'bn' ? e.toNodeNameBn : e.toNodeNameEn}
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 11, background: 'var(--ground2)', color: 'var(--cream)', textTransform: 'uppercase' }}>
                                {e.mode}
                              </span>
                            </td>
                            <td style={{ padding: '8px 10px', color: 'var(--cream)' }}>
                              {num(e.baseMinutes, lang)} {lang === 'bn' ? 'মি.' : 'min'}
                            </td>
                            <td style={{ padding: '8px 10px', color: 'var(--metro)', fontWeight: 700 }}>
                              ৳{num(e.fareTaka, lang)}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                              <button
                                type="button"
                                className="action-chip action-chip--logout"
                                onClick={() => handleDeleteEdge(e.id)}
                                style={{ padding: '2px 8px', fontSize: 11 }}
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

                {/* Add Edge Modal */}
                {showAddEdgeModal && (
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
                          {lang === 'bn' ? 'নতুন রুট সংযোগ (Edge) যুক্ত করুন' : 'Add Route Connection Edge'}
                        </h3>
                        <button type="button" className="action-chip" onClick={() => setShowAddEdgeModal(false)}>✕</button>
                      </div>

                      <form onSubmit={handleCreateEdge} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'শুরু (From Node ID)' : 'From Node ID'}</label>
                            <input
                              type="text"
                              className="profile-form-input"
                              value={edgeForm.fromNode}
                              onChange={(e) => setEdgeForm({ ...edgeForm, fromNode: e.target.value })}
                              required
                            />
                          </div>

                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'গন্তব্য (To Node ID)' : 'To Node ID'}</label>
                            <input
                              type="text"
                              className="profile-form-input"
                              value={edgeForm.toNode}
                              onChange={(e) => setEdgeForm({ ...edgeForm, toNode: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="profile-form-group">
                          <label className="profile-form-label">{lang === 'bn' ? 'পরিবহন মোড' : 'Transit Mode'}</label>
                          <select
                            className="profile-form-input"
                            value={edgeForm.mode}
                            onChange={(e) => setEdgeForm({ ...edgeForm, mode: e.target.value })}
                          >
                            <option value="metro">Metro</option>
                            <option value="bus">Bus</option>
                            <option value="cng">CNG</option>
                            <option value="rickshaw">Rickshaw</option>
                            <option value="walk">Walk</option>
                          </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'যাত্রার সময় (মিনিট)' : 'Base Minutes'}</label>
                            <input
                              type="number"
                              className="profile-form-input"
                              value={edgeForm.baseMinutes}
                              onChange={(e) => setEdgeForm({ ...edgeForm, baseMinutes: parseInt(e.target.value, 10) })}
                              min="1"
                              required
                            />
                          </div>

                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'ভাড়া (টাকা)' : 'Fare (Taka)'}</label>
                            <input
                              type="number"
                              className="profile-form-input"
                              value={edgeForm.fareTaka}
                              onChange={(e) => setEdgeForm({ ...edgeForm, fareTaka: parseInt(e.target.value, 10) })}
                              min="0"
                              required
                            />
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                          <button type="button" className="action-chip" onClick={() => setShowAddEdgeModal(false)}>
                            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                          </button>
                          <button type="submit" className="action-chip action-chip--highlight" style={{ fontWeight: 700 }}>
                            {lang === 'bn' ? '✓ রুট সেভ করুন' : '✓ Save Connection'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ----------------- TAB 5: ANOMALIES & DISRUPTIONS ----------------- */}
            {activeTab === 'anomalies' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      className={`action-chip ${anomalyFilter === '' ? 'action-chip--highlight' : ''}`}
                      onClick={() => setAnomalyFilter('')}
                    >
                      {lang === 'bn' ? 'সকল' : 'All'}
                    </button>
                    <button
                      type="button"
                      className={`action-chip ${anomalyFilter === 'active' ? 'action-chip--highlight' : ''}`}
                      onClick={() => setAnomalyFilter('active')}
                    >
                      ⚠️ {lang === 'bn' ? 'সক্রিয়' : 'Active Only'}
                    </button>
                    <button
                      type="button"
                      className={`action-chip ${anomalyFilter === 'resolved' ? 'action-chip--highlight' : ''}`}
                      onClick={() => setAnomalyFilter('resolved')}
                    >
                      ✓ {lang === 'bn' ? 'সমাধানকৃত' : 'Resolved'}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="action-chip action-chip--highlight"
                    onClick={() => setShowBroadcastModal(true)}
                    style={{ fontWeight: 700 }}
                  >
                    + {lang === 'bn' ? 'নতুন ডিজরাপশন ব্রডকাস্ট করুন' : '+ Broadcast Live Disruption'}
                  </button>
                </div>

                {/* Anomalies List */}
                <div className="profile-card" style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, fontFamily: 'var(--data)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--c70)', textAlign: 'left' }}>
                        <th style={{ padding: '10px 12px' }}>ID</th>
                        <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'ধরন' : 'Type'}</th>
                        <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'কারণ ও বিবরণ' : 'Reason / Details'}</th>
                        <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'শুরুর সময়' : 'Started At'}</th>
                        <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'মেয়াদ' : 'Expires At'}</th>
                        <th style={{ padding: '10px 12px' }}>{lang === 'bn' ? 'স্ট্যাটাস' : 'Status'}</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>{lang === 'bn' ? 'অ্যাকশন' : 'Action'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {anomalies.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--c70)' }}>
                            {lang === 'bn' ? 'কোনো ডিজরাপশন অ্যালার্ট পাওয়া যায়নি।' : 'No disruption alerts recorded.'}
                          </td>
                        </tr>
                      ) : (
                        anomalies.map((a) => (
                          <tr key={a.id} style={{ borderBottom: '1px solid var(--line)' }}>
                            <td style={{ padding: '10px 12px', color: 'var(--c70)' }}>#{a.id}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 11, background: 'var(--ground2)', color: 'var(--stamp)', fontWeight: 600 }}>
                                {a.type}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--cream)', fontWeight: 600 }}>
                              {a.reason}
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--c70)', fontSize: 12 }}>
                              {formatDate(a.startsAt || a.createdAt, lang)}
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--c70)', fontSize: 12 }}>
                              {a.expiresAt ? formatDate(a.expiresAt, lang) : (lang === 'bn' ? 'ম্যানুয়াল সমাধান' : 'Manual Resolve')}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: 3,
                                fontSize: 11,
                                fontWeight: 700,
                                background: a.status === 'active' ? 'rgba(168, 56, 42, 0.2)' : 'rgba(39, 185, 122, 0.2)',
                                color: a.status === 'active' ? 'var(--stamp)' : 'var(--metro)'
                              }}>
                                {a.status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              {a.status === 'active' && (
                                <button
                                  type="button"
                                  className="action-chip action-chip--highlight"
                                  onClick={() => handleResolveAnomaly(a.id)}
                                  style={{ fontSize: 12, padding: '3px 8px' }}
                                >
                                  ✓ {lang === 'bn' ? 'সমাধান করুন' : 'Resolve'}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Broadcast Disruption Modal */}
                {showBroadcastModal && (
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
                    <div className="profile-card" style={{ maxWidth: 520, width: '100%', border: '1px solid var(--stamp)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 18, color: 'var(--stamp)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>⚠️</span>
                          <span>{lang === 'bn' ? 'লাইভ ট্রাফিক ডিজরাপশন ব্রডকাস্ট' : 'Broadcast Live Disruption Alert'}</span>
                        </h3>
                        <button type="button" className="action-chip" onClick={() => setShowBroadcastModal(false)}>✕</button>
                      </div>

                      <form onSubmit={handleBroadcastAnomaly} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div className="profile-form-group">
                          <label className="profile-form-label">{lang === 'bn' ? 'ডিজরাপশনের ধরন' : 'Incident Type'}</label>
                          <select
                            className="profile-form-input"
                            value={anomalyForm.type}
                            onChange={(e) => setAnomalyForm({ ...anomalyForm, type: e.target.value })}
                          >
                            <option value="waterlogging">Waterlogging (জলজট / জলাবদ্ধতা)</option>
                            <option value="traffic_jam">Severe Traffic Jam (তীব্র যানজট)</option>
                            <option value="road_block">Road Block / Protest (রাস্তা অবরোধ)</option>
                            <option value="metro_issue">Metro Signal / Technical Issue (মেট্রো বিলম্ব)</option>
                            <option value="vip_movement">VIP Movement (ভিআইপি প্রটোকল)</option>
                            <option value="accident">Accident / Vehicle Breakdown (দুর্ঘটনা)</option>
                          </select>
                        </div>

                        <div className="profile-form-group">
                          <label className="profile-form-label">{lang === 'bn' ? 'কারণ ও বিবরণ' : 'Disruption Reason / Notice'}</label>
                          <textarea
                            className="profile-form-input"
                            rows={3}
                            placeholder={lang === 'bn' ? 'যেমন: কাজীপাড়া মেট্রোরেল স্টেশনের নিচে জলাবদ্ধতা, যান চলাচল ধীরগতির...' : 'e.g. Heavy waterlogging near Kazipara station, delay expected...'}
                            value={anomalyForm.reason}
                            onChange={(e) => setAnomalyForm({ ...anomalyForm, reason: e.target.value })}
                            required
                          />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'শুরুর স্টেশন (From)' : 'From Station'}</label>
                            <select
                              className="profile-form-input"
                              value={anomalyForm.affectedFrom}
                              onChange={(e) => setAnomalyForm({ ...anomalyForm, affectedFrom: e.target.value })}
                            >
                              {MRT6_STATIONS_LIST.map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>

                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'গন্তব্য স্টেশন (To)' : 'To Station'}</label>
                            <select
                              className="profile-form-input"
                              value={anomalyForm.affectedTo}
                              onChange={(e) => setAnomalyForm({ ...anomalyForm, affectedTo: e.target.value })}
                            >
                              {MRT6_STATIONS_LIST.map((st) => (
                                <option key={st} value={st}>{st}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'স্থায়িত্ব (মিনিট)' : 'Duration (Minutes)'}</label>
                            <select
                              className="profile-form-input"
                              value={anomalyForm.durationMinutes}
                              onChange={(e) => setAnomalyForm({ ...anomalyForm, durationMinutes: parseInt(e.target.value, 10) })}
                            >
                              <option value="15">15 Minutes</option>
                              <option value="30">30 Minutes</option>
                              <option value="60">1 Hour (60m)</option>
                              <option value="120">2 Hours (120m)</option>
                              <option value="240">4 Hours (240m)</option>
                            </select>
                          </div>

                          <div className="profile-form-group">
                            <label className="profile-form-label">{lang === 'bn' ? 'দেরি মাল্টিপ্লায়ার' : 'Delay Multiplier'}</label>
                            <select
                              className="profile-form-input"
                              value={anomalyForm.multiplier}
                              onChange={(e) => setAnomalyForm({ ...anomalyForm, multiplier: parseFloat(e.target.value) })}
                            >
                              <option value="1.3">1.3x (+30% delay)</option>
                              <option value="1.5">1.5x (+50% delay)</option>
                              <option value="2.0">2.0x (Double time)</option>
                              <option value="3.0">3.0x (Triple time / Severe)</option>
                            </select>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
                          <button type="button" className="action-chip" onClick={() => setShowBroadcastModal(false)}>
                            {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                          </button>
                          <button type="submit" className="action-chip action-chip--logout" style={{ fontWeight: 700 }}>
                            📢 {lang === 'bn' ? 'ব্রডকাস্ট করুন' : 'Broadcast Alert'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ----------------- TAB 6: INCIDENT REPORTS ----------------- */}
            {activeTab === 'incidents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    type="button"
                    className={`action-chip ${incidentStatusFilter === '' ? 'action-chip--highlight' : ''}`}
                    onClick={() => setIncidentStatusFilter('')}
                  >
                    {lang === 'bn' ? 'সকল রিপোর্ট' : 'All Reports'}
                  </button>
                  <button
                    type="button"
                    className={`action-chip ${incidentStatusFilter === 'pending' ? 'action-chip--highlight' : ''}`}
                    onClick={() => setIncidentStatusFilter('pending')}
                  >
                    ⏳ {lang === 'bn' ? 'অমীমাংসিত (Pending)' : 'Pending Queue'}
                  </button>
                  <button
                    type="button"
                    className={`action-chip ${incidentStatusFilter === 'verified' ? 'action-chip--highlight' : ''}`}
                    onClick={() => setIncidentStatusFilter('verified')}
                  >
                    ✓ {lang === 'bn' ? 'অনুমোদিত (Verified)' : 'Verified'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                  {incidents.length === 0 ? (
                    <div className="profile-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--c70)' }}>
                      <p style={{ margin: 0 }}>✓ {lang === 'bn' ? 'কোনো অমীমাংসিত রিপোর্ট নেই' : 'No incident reports found.'}</p>
                    </div>
                  ) : (
                    incidents.map((inc) => (
                      <div key={inc.id} className="profile-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: `4px solid ${inc.status === 'pending' ? 'var(--sev-3)' : (inc.status === 'verified' ? 'var(--metro)' : 'var(--c45)')}` }}>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: 3,
                              fontSize: 11,
                              fontWeight: 700,
                              background: 'var(--ground2)',
                              color: inc.severity === 'severe' || inc.severity === 'critical' ? 'var(--stamp)' : 'var(--sev-2)',
                              textTransform: 'uppercase'
                            }}>
                              {inc.type} • {inc.severity}
                            </span>
                            <span style={{ fontSize: 11.5, color: 'var(--c70)' }}>
                              👍 {num(inc.upvotes, lang)}
                            </span>
                          </div>

                          <h4 style={{ margin: '6px 0 4px', fontSize: 16, color: 'var(--cream)' }}>
                            {inc.title}
                          </h4>
                          <p style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--c70)', lineHeight: 1.4 }}>
                            {inc.description}
                          </p>

                          <div style={{ fontSize: 12, color: 'var(--c45)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <span>📍 {inc.locationName}</span>
                            <span>👤 {inc.reporterName} • {formatDate(inc.createdAt, lang)}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 14, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                          {inc.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                className="action-chip action-chip--highlight"
                                onClick={() => handleUpdateIncident(inc.id, 'verified')}
                                style={{ fontSize: 12 }}
                              >
                                ✓ {lang === 'bn' ? 'অনুমোদন' : 'Verify & Map'}
                              </button>
                              <button
                                type="button"
                                className="action-chip action-chip--logout"
                                onClick={() => handleUpdateIncident(inc.id, 'rejected')}
                                style={{ fontSize: 12 }}
                              >
                                ✕ {lang === 'bn' ? 'বাতিল' : 'Reject'}
                              </button>
                            </>
                          )}
                          {inc.status === 'verified' && (
                            <button
                              type="button"
                              className="action-chip"
                              onClick={() => handleUpdateIncident(inc.id, 'resolved')}
                              style={{ fontSize: 12 }}
                            >
                              ✓ {lang === 'bn' ? 'সমাধান চিহ্নিত করুন' : 'Mark Resolved'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ----------------- TAB 7: AUDIT & SETTINGS ----------------- */}
            {activeTab === 'settings' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginTop: 16 }}>
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

                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--metro)', borderBottom: '1px solid var(--line)', paddingBottom: 4, marginTop: 6 }}>
                      🔔 {lang === 'bn' ? 'ডিপার্চার ও জ্যাম অ্যালার্ট থ্রেশহোল্ড' : 'Commuter Departure Thresholds'}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div className="profile-form-group">
                        <label className="profile-form-label">{lang === 'bn' ? 'ন্যূনতম সাশ্রয় (মিনিট)' : 'Min Saving (Min)'}</label>
                        <input
                          type="number"
                          className="profile-form-input"
                          value={settingsForm.minSavingMinutes}
                          onChange={(e) => setSettingsForm({ ...settingsForm, minSavingMinutes: e.target.value })}
                        />
                      </div>
                      <div className="profile-form-group">
                        <label className="profile-form-label">{lang === 'bn' ? 'কুলডাউন বিরতি (মিনিট)' : 'Alert Cooldown (Min)'}</label>
                        <input
                          type="number"
                          className="profile-form-input"
                          value={settingsForm.cooldownMinutes}
                          onChange={(e) => setSettingsForm({ ...settingsForm, cooldownMinutes: e.target.value })}
                        />
                      </div>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--stamp)', borderBottom: '1px solid var(--line)', paddingBottom: 4, marginTop: 6 }}>
                      📢 {lang === 'bn' ? 'জরুরি সিস্টেম ব্রডকাস্ট ব্যানার' : 'Emergency System Broadcast Banner'}
                    </div>

                    <div className="profile-form-group">
                      <label className="profile-form-label">{lang === 'bn' ? 'ব্যানার বার্তা (বাংলা)' : 'Banner Notice (Bangla)'}</label>
                      <input
                        type="text"
                        className="profile-form-input"
                        placeholder="যেমন: মতিঝিল-মিরপুর রুটে মেট্রোরেল শিডিউল স্বাভাবিক আছে।"
                        value={settingsForm.bannerBn}
                        onChange={(e) => setSettingsForm({ ...settingsForm, bannerBn: e.target.value })}
                      />
                    </div>

                    <div className="profile-form-group">
                      <label className="profile-form-label">{lang === 'bn' ? 'ব্যানার বার্তা (English)' : 'Banner Notice (English)'}</label>
                      <input
                        type="text"
                        className="profile-form-input"
                        placeholder="e.g. MRT-6 schedule operating on full frequency."
                        value={settingsForm.bannerEn}
                        onChange={(e) => setSettingsForm({ ...settingsForm, bannerEn: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <button type="submit" className="action-chip action-chip--highlight" style={{ fontWeight: 700 }}>
                        {lang === 'bn' ? '✓ সেটিংস সংরক্ষণ করুন' : '✓ Save System Settings'}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Audit Logs Stream */}
                <div className="profile-card">
                  <h3 style={{ margin: '0 0 14px', fontSize: 17, color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>📜</span>
                    <span>{lang === 'bn' ? 'অ্যাডমিন অডিট লগ হিস্ট্রি' : 'Admin Audit Trail'}</span>
                  </h3>

                  <div style={{ maxHeight: 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {auditLogs.length === 0 ? (
                      <p style={{ color: 'var(--c70)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                        {lang === 'bn' ? 'কোনো অডিট লগ নেই' : 'No audit logs recorded yet.'}
                      </p>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} style={{
                          padding: '10px 12px',
                          background: 'var(--ground2)',
                          borderRadius: 4,
                          fontSize: 12.5,
                          fontFamily: 'var(--data)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, color: 'var(--metro)' }}>
                              {log.action}
                            </span>
                            <span style={{ color: 'var(--c45)', fontSize: 11 }}>
                              {formatDate(log.createdAt, lang)}
                            </span>
                          </div>

                          <div style={{ color: 'var(--cream)' }}>
                            <strong>{log.adminName}</strong> ({log.adminRole}) • {log.targetType} {log.targetId ? `[${log.targetId}]` : ''}
                          </div>

                          {log.details && (
                            <pre style={{
                              margin: '6px 0 0',
                              padding: '6px 8px',
                              background: 'var(--ground)',
                              borderRadius: 3,
                              fontSize: 11,
                              color: 'var(--c70)',
                              overflowX: 'auto'
                            }}>
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
