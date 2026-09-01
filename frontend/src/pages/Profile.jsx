import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getProfile,
  updateProfile,
  saveRoute,
  deleteSavedRoute,
  addFavoriteStop,
  deleteFavoriteStop
} from '../services/profile.service.js';
import { saveStoredSession, getStoredAuthToken } from '../services/auth.storage.js';
import { useLanguage } from '../state/LanguageContext.jsx';
import { useTheme } from '../state/ThemeContext.jsx';
import { useTrip } from '../state/TripContext.jsx';
import { toBanglaDigits } from '../utils/format.js';
import { ModeIcon } from '../components/ModeIcon.jsx';
import { Loader } from '../components/UI/Loader.jsx';
import '../styles/tokens.css';

function num(val, lang) {
  return lang === 'bn' ? toBanglaDigits(val) : String(val);
}

function formatDate(value, lang) {
  if (!value) return lang === 'bn' ? 'তথ্য নেই' : 'Not available';
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

  if (lang === 'bn') {
    return `${toBanglaDigits(day)} ${monthNamesBn[date.getMonth()]} ${toBanglaDigits(year)}`;
  }
  return `${day} ${monthNamesEn[date.getMonth()]} ${year}`;
}

function formatTimeAgo(dateString, lang) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return lang === 'bn' ? 'এইমাত্র' : 'Just now';
  if (diffMins < 60) return lang === 'bn' ? `${toBanglaDigits(diffMins)} মিনিট আগে` : `${diffMins} min ago`;
  if (diffHours < 24) return lang === 'bn' ? `${toBanglaDigits(diffHours)} ঘণ্টা আগে` : `${diffHours} hours ago`;
  if (diffDays < 7) return lang === 'bn' ? `${toBanglaDigits(diffDays)} দিন আগে` : `${diffDays} days ago`;
  return formatDate(dateString, lang);
}

// All 16 authentic MRT-6 stations in Dhaka
const MRT6_STATIONS = [
  { id: 'mrt_uttara_north', nameBn: 'উত্তরা উত্তর', nameEn: 'Uttara North', lat: 23.8694, lng: 90.3675 },
  { id: 'mrt_uttara_center', nameBn: 'উত্তরা সেন্টার', nameEn: 'Uttara Center', lat: 23.8598, lng: 90.3651 },
  { id: 'mrt_uttara_south', nameBn: 'উত্তরা দক্ষিণ', nameEn: 'Uttara South', lat: 23.8456, lng: 90.3631 },
  { id: 'mrt_pallabi', nameBn: 'পল্লবী', nameEn: 'Pallabi', lat: 23.8262, lng: 90.3642 },
  { id: 'mrt_mirpur_11', nameBn: 'মিরপুর ১১', nameEn: 'Mirpur 11', lat: 23.8191, lng: 90.3653 },
  { id: 'mrt_mirpur_10', nameBn: 'মিরপুর ১০', nameEn: 'Mirpur 10', lat: 23.8084, lng: 90.3682 },
  { id: 'mrt_kazipara', nameBn: 'কাজীপাড়া', nameEn: 'Kazipara', lat: 23.7992, lng: 90.3720 },
  { id: 'mrt_shewrapara', nameBn: 'শেওড়াপাড়া', nameEn: 'Shewrapara', lat: 23.7909, lng: 90.3755 },
  { id: 'mrt_agargaon', nameBn: 'আগারগাঁও', nameEn: 'Agargaon', lat: 23.7777, lng: 90.3802 },
  { id: 'mrt_bijoy_sarani', nameBn: 'বিজয় সরণি', nameEn: 'Bijoy Sarani', lat: 23.7664, lng: 90.3763 },
  { id: 'mrt_farmgate', nameBn: 'ফার্মগেট', nameEn: 'Farmgate', lat: 23.7602, lng: 90.3865 },
  { id: 'mrt_karwan_bazar', nameBn: 'কাওরান বাজার', nameEn: 'Karwan Bazar', lat: 23.7513, lng: 90.3927 },
  { id: 'mrt_shahbagh', nameBn: 'শাহবাগ', nameEn: 'Shahbagh', lat: 23.7395, lng: 90.3960 },
  { id: 'mrt_dhaka_university', nameBn: 'ঢাকা বিশ্ববিদ্যালয়', nameEn: 'Dhaka University', lat: 23.7319, lng: 90.3965 },
  { id: 'mrt_secretariat', nameBn: 'বাংলাদেশ সচিবালয়', nameEn: 'Bangladesh Secretariat', lat: 23.7300, lng: 90.4075 },
  { id: 'mrt_motijheel', nameBn: 'মতিঝিল', nameEn: 'Motijheel', lat: 23.7281, lng: 90.4191 }
];

function findStationByNameOrId(query) {
  if (!query) return null;
  const q = String(query).trim().toLowerCase();
  return MRT6_STATIONS.find(
    (s) =>
      s.id.toLowerCase() === q ||
      s.nameBn.toLowerCase() === q ||
      s.nameEn.toLowerCase() === q ||
      q.includes(s.nameBn.toLowerCase()) ||
      q.includes(s.nameEn.toLowerCase())
  );
}

export function Profile({ user, onUpdateUser, onLogout }) {
  const { lang, setLang } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { setOrigin, setDestination } = useTrip();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('routes');
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '' });
  const [isUpdating, setIsUpdating] = useState(false);

  const [showAddRoute, setShowAddRoute] = useState(false);
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [routeForm, setRouteForm] = useState({
    name: '',
    fromLocation: '',
    toLocation: '',
    mode: 'metro',
    durationMinutes: ''
  });

  const [showAddStop, setShowAddStop] = useState(false);
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [stopForm, setStopForm] = useState({
    name: '',
    nodeId: ''
  });

  const [copiedId, setCopiedId] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchProfileData() {
      try {
        const data = await getProfile();
        if (!isMounted) return;
        setProfileData(data);
        setEditForm({
          name: data?.user?.name || user?.name || '',
          email: data?.user?.email || user?.email || ''
        });
      } catch (err) {
        if (!isMounted) return;
        setError(err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchProfileData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  async function refreshProfile() {
    try {
      setIsRefreshing(true);
      setError(null);
      const data = await getProfile();
      setProfileData(data);
      setEditForm({
        name: data?.user?.name || user?.name || '',
        email: data?.user?.email || user?.email || ''
      });
      setSuccessMessage(lang === 'bn' ? 'প্রোফাইল আপডেট সম্পন্ন হয়েছে' : 'Profile data synchronized');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    try {
      setIsUpdating(true);
      const updated = await updateProfile(editForm);
      const updatedUser = updated.user || updated;
      setProfileData((prev) => ({ ...prev, user: updatedUser }));
      const token = getStoredAuthToken();
      if (token) saveStoredSession({ token, user: updatedUser });
      if (onUpdateUser) onUpdateUser(updatedUser);
      setIsEditing(false);
      setSuccessMessage(lang === 'bn' ? 'তথ্য সফলভাবে সংরক্ষিত হয়েছে' : 'Profile updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleCreateRoute(e) {
    e.preventDefault();
    if (!routeForm.name || !routeForm.fromLocation || !routeForm.toLocation) return;
    try {
      setIsSavingRoute(true);
      const result = await saveRoute({
        ...routeForm,
        durationMinutes: routeForm.durationMinutes ? Number(routeForm.durationMinutes) : null
      });
      const newRoute = {
        id: result.id || Date.now(),
        name: routeForm.name,
        fromLocation: routeForm.fromLocation,
        toLocation: routeForm.toLocation,
        mode: routeForm.mode,
        durationMinutes: routeForm.durationMinutes ? Number(routeForm.durationMinutes) : null,
        createdAt: new Date().toISOString()
      };
      setProfileData((prev) => ({
        ...prev,
        savedRoutes: [newRoute, ...(prev?.savedRoutes || [])]
      }));
      setRouteForm({ name: '', fromLocation: '', toLocation: '', mode: 'metro', durationMinutes: '' });
      setShowAddRoute(false);
      setSuccessMessage(lang === 'bn' ? 'রুট সফলভাবে সংরক্ষিত হয়েছে' : 'Route saved successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingRoute(false);
    }
  }

  async function handleDeleteRoute(routeId) {
    try {
      await deleteSavedRoute(routeId);
      setProfileData((prev) => ({
        ...prev,
        savedRoutes: (prev?.savedRoutes || []).filter((r) => r.id !== routeId)
      }));
      setSuccessMessage(lang === 'bn' ? 'রুট মুছে ফেলা হয়েছে' : 'Route removed');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleUseRoute(route) {
    const originStation = findStationByNameOrId(route.fromLocation);
    const destStation = findStationByNameOrId(route.toLocation);

    const originPoint = originStation
      ? {
          lat: originStation.lat,
          lng: originStation.lng,
          label: lang === 'bn' ? originStation.nameBn : originStation.nameEn,
          nodeId: originStation.id
        }
      : {
          label: route.fromLocation,
          lat: 23.8084,
          lng: 90.3682
        };

    const destPoint = destStation
      ? {
          lat: destStation.lat,
          lng: destStation.lng,
          label: lang === 'bn' ? destStation.nameBn : destStation.nameEn,
          nodeId: destStation.id
        }
      : {
          label: route.toLocation,
          lat: 23.7281,
          lng: 90.4191
        };

    setOrigin(originPoint);
    setDestination(destPoint);
    navigate('/map');
  }

  async function handleCreateStop(e) {
    e.preventDefault();
    if (!stopForm.name) return;
    try {
      setIsAddingStop(true);
      const matched = findStationByNameOrId(stopForm.nodeId || stopForm.name);
      const result = await addFavoriteStop({
        name: stopForm.name,
        nodeId: stopForm.nodeId || matched?.id || null,
        latitude: matched?.lat || null,
        longitude: matched?.lng || null
      });
      const newStop = {
        id: result.id || Date.now(),
        name: stopForm.name,
        nodeId: stopForm.nodeId || matched?.id || null,
        latitude: matched?.lat || null,
        longitude: matched?.lng || null,
        createdAt: new Date().toISOString()
      };
      setProfileData((prev) => ({
        ...prev,
        favoriteStops: [newStop, ...(prev?.favoriteStops || [])]
      }));
      setStopForm({ name: '', nodeId: '' });
      setShowAddStop(false);
      setSuccessMessage(lang === 'bn' ? 'স্টপ পিন করা হয়েছে' : 'Stop pinned to favorites');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAddingStop(false);
    }
  }

  async function handleQuickAddStation(station) {
    try {
      const name = lang === 'bn' ? station.nameBn : station.nameEn;
      const result = await addFavoriteStop({
        name,
        nodeId: station.id,
        latitude: station.lat,
        longitude: station.lng
      });
      const newStop = {
        id: result.id || Date.now(),
        name,
        nodeId: station.id,
        latitude: station.lat,
        longitude: station.lng,
        createdAt: new Date().toISOString()
      };
      setProfileData((prev) => ({
        ...prev,
        favoriteStops: [newStop, ...(prev?.favoriteStops || []).filter((s) => s.nodeId !== station.id)]
      }));
      setSuccessMessage(lang === 'bn' ? `${name} প্রিয় তালিকায় যুক্ত হয়েছে` : `${name} pinned to favorites`);
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteStop(stopId) {
    try {
      await deleteFavoriteStop(stopId);
      setProfileData((prev) => ({
        ...prev,
        favoriteStops: (prev?.favoriteStops || []).filter((s) => s.id !== stopId)
      }));
      setSuccessMessage(lang === 'bn' ? 'স্টপ তালিকা থেকে সরানো হয়েছে' : 'Stop unpinned');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleUseStopAsDestination(stop) {
    const station = findStationByNameOrId(stop.nodeId || stop.name);
    const destPoint = {
      lat: stop.latitude || station?.lat || 23.7281,
      lng: stop.longitude || station?.lng || 90.4191,
      label: stop.name,
      nodeId: stop.nodeId || station?.id || null
    };
    setDestination(destPoint);
    navigate('/map');
  }

  function handleUseStopAsOrigin(stop) {
    const station = findStationByNameOrId(stop.nodeId || stop.name);
    const originPoint = {
      lat: stop.latitude || station?.lat || 23.8084,
      lng: stop.longitude || station?.lng || 90.3682,
      label: stop.name,
      nodeId: stop.nodeId || station?.id || null
    };
    setOrigin(originPoint);
    navigate('/map');
  }

  async function copyUserId() {
    if (!currentUser?.id) return;
    try {
      await navigator.clipboard.writeText(String(currentUser.id));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } catch {
      setError('Failed to copy ID');
    }
  }

  if (loading) {
    return (
      <div className="profile-page-wrapper">
        <div className="profile-container" style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
          <Loader label={lang === 'bn' ? 'প্রোফাইল লোড হচ্ছে...' : 'Loading commuter profile...'} />
        </div>
      </div>
    );
  }

  const currentUser = profileData?.user || user;
  const stats = profileData?.stats || {
    totalTrips: 0,
    totalDistance: 0,
    totalMinutes: 0,
    savedRoutesCount: 0,
    favoriteStopsCount: 0
  };
  const savedRoutes = profileData?.savedRoutes || [];
  const favoriteStops = profileData?.favoriteStops || [];
  const trips = profileData?.trips || [];

  const isGuest = Boolean(currentUser?.isGuest || (!currentUser?.email && !currentUser?.googleId));
  const isGoogle = Boolean(currentUser?.googleId);

  const initialLetter = (currentUser?.name || currentUser?.email || 'U')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="profile-page-wrapper">
      <div className="profile-container">

        {/* Feedback / Alert Banners */}
        {error && (
          <div className="profile-alert-banner profile-alert-banner--error">
            <span>⚠️ {error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {successMessage && (
          <div className="profile-alert-banner profile-alert-banner--success">
            <span>✓ {successMessage}</span>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* 1. TICKET STUB COMMUTER PASS HERO */}
        <div className="profile-hero-card">
          <div className="profile-hero-left">
            <div className="profile-avatar-wrap">
              <div className={`profile-avatar ${isGuest ? 'profile-avatar--guest' : ''}`}>
                {initialLetter}
              </div>
              <span
                className={`profile-avatar-online-dot ${isGuest ? 'profile-avatar-online-dot--guest' : ''}`}
                title={isGuest ? 'Guest Session' : 'Active Commuter Beacon'}
              />
            </div>

            <div className="profile-hero-info">
              <div className="profile-hero-name-row">
                <h1 className="profile-hero-name">
                  {currentUser?.name || (isGuest ? (lang === 'bn' ? 'গেস্ট যাত্রী' : 'Guest Commuter') : 'Commuter')}
                </h1>
                {isGuest ? (
                  <span className="profile-tag profile-tag--guest">
                    {lang === 'bn' ? 'গেস্ট সেশন' : 'Guest Session'}
                  </span>
                ) : isGoogle ? (
                  <span className="profile-tag profile-tag--google">
                    {lang === 'bn' ? 'গুগল কানেক্টেড' : 'Google Connected'}
                  </span>
                ) : (
                  <span className="profile-tag profile-tag--verified">
                    ✓ {lang === 'bn' ? 'যাচাইকৃত যাত্রী' : 'Verified Commuter'}
                  </span>
                )}
              </div>

              <div className="profile-hero-rank">
                <span>🚇</span>
                <span>{lang === 'bn' ? 'ঢাকা ট্রানজিট যাত্রী · লেভেল ১' : 'Dhaka Transit Commuter · Level 1'}</span>
              </div>

              <p className="profile-hero-email">
                {currentUser?.email || (lang === 'bn' ? 'কোনো ইমেইল যুক্ত নেই (অস্থায়ী)' : 'No email associated (Temporary)')}
              </p>

              <div className="profile-meta-row">
                <span>
                  {lang === 'bn' ? 'যুক্ত হয়েছেন: ' : 'Member since: '}
                  <strong>{formatDate(currentUser?.createdAt, lang)}</strong>
                </span>

                {currentUser?.id ? (
                  <button
                    type="button"
                    className="profile-id-chip"
                    onClick={copyUserId}
                    title="Click to copy Commuter ID"
                  >
                    <span>ID: #{currentUser.id}</span>
                    <span style={{ fontSize: 11, color: copiedId ? 'var(--metro)' : 'var(--c70)' }}>
                      {copiedId ? (lang === 'bn' ? '✓ কপি হয়েছে' : '✓ Copied') : (lang === 'bn' ? '📋 কপি' : '📋 Copy')}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="profile-hero-actions">
            {isGuest ? (
              <button
                type="button"
                className="action-chip action-chip--highlight"
                onClick={() => navigate('/register')}
                style={{ fontWeight: 700 }}
              >
                ✨ {lang === 'bn' ? 'অ্যাকাউন্ট সেভ করুন' : 'Save Account'}
              </button>
            ) : null}

            <button
              type="button"
              className="action-chip"
              onClick={() => {
                setActiveTab('settings');
                setIsEditing(true);
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
              {lang === 'bn' ? 'এডিট প্রোফাইল' : 'Edit Profile'}
            </button>

            <button
              type="button"
              className="action-chip"
              onClick={refreshProfile}
              disabled={isRefreshing}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19"/>
              </svg>
              {isRefreshing ? (lang === 'bn' ? 'সিঙ্ক হচ্ছে...' : 'Syncing...') : (lang === 'bn' ? 'সিঙ্ক' : 'Sync')}
            </button>

            <button
              type="button"
              className="action-chip action-chip--logout"
              onClick={onLogout}
            >
              {lang === 'bn' ? 'লগআউট' : 'Logout'}
            </button>
          </div>
        </div>

        {/* 2. GUEST UPGRADE ALERT BANNER */}
        {isGuest && (
          <div className="profile-guest-warning-card">
            <div className="profile-guest-warning-header">
              <div className="profile-guest-warning-icon">⚠️</div>
              <div>
                <h2 className="profile-guest-warning-title">
                  {lang === 'bn'
                    ? 'অস্থায়ী গেস্ট সেশন — এখনই ফ্রি অ্যাকাউন্ট খুলে আপনার ডেটা সুরক্ষিত করুন'
                    : 'Temporary Guest Session — Create an Account to Keep Your Data Permanently'}
                </h2>
                <p className="profile-guest-warning-desc">
                  {lang === 'bn'
                    ? 'আপনি বর্তমানে গেস্ট হিসেবে ট্রানজিট রুট ও স্টেশন ব্রাউজ করছেন। ব্রাউজার ক্যাশ বা সেশন শেষ হলে সংরক্ষিত রুট ও হিস্ট্রি মুছে যেতে পারে। আজীবন সব ডেটা যেকোনো ডিভাইসে সিঙ্ক রাখতে এখনই রেজিস্টার করুন।'
                    : 'You are currently using a temporary guest session. To permanently sync your saved routes, pinned MRT stations, and journey history across all your devices, sign up for free.'}
                </p>
              </div>
            </div>

            <div className="profile-guest-benefits">
              <span className="profile-guest-benefit-chip">
                🔒 {lang === 'bn' ? 'স্থায়ী ক্লাউড ব্যাকআপ' : 'Permanent Cloud Storage'}
              </span>
              <span className="profile-guest-benefit-chip">
                📱 {lang === 'bn' ? 'যেকোনো ডিভাইসে সিঙ্ক' : 'Cross-Device Sync'}
              </span>
              <span className="profile-guest-benefit-chip">
                ⚡ {lang === 'bn' ? '১-ক্লিকে ম্যাপে রুট চালু' : '1-Click Saved Navigation'}
              </span>
            </div>

            <div className="profile-guest-warning-actions">
              <button
                type="button"
                className="action-chip action-chip--highlight"
                style={{ padding: '8px 18px', fontWeight: 700 }}
                onClick={() => navigate('/register', { state: { name: currentUser?.name !== 'Guest Commuter' ? currentUser?.name : '' } })}
              >
                ✨ {lang === 'bn' ? 'স্থায়ী অ্যাকাউন্ট তৈরি করুন (Sign Up)' : 'Create Free Account'}
              </button>

              <button
                type="button"
                className="action-chip"
                style={{ padding: '8px 16px' }}
                onClick={() => navigate('/login')}
              >
                🔑 {lang === 'bn' ? 'পূর্বের অ্যাকাউন্টে লগইন' : 'Log in to Existing Account'}
              </button>
            </div>
          </div>
        )}

        {/* 3. COMMUTER TRAVEL METRICS GRID */}
        <div className="profile-stats-grid">
          <div className="profile-stat-box profile-stat-box--metro">
            <div className="profile-stat-header">
              <span className="profile-stat-label">{lang === 'bn' ? 'মোট ট্রিপ' : 'Total Trips'}</span>
              <div className="profile-stat-icon-wrap" style={{ color: 'var(--metro)' }}>🚇</div>
            </div>
            <div className="profile-stat-num">{num(stats.totalTrips || 0, lang)}</div>
            <span className="profile-stat-subtext">{lang === 'bn' ? 'সম্পন্ন জার্নি' : 'Completed Journeys'}</span>
          </div>

          <div className="profile-stat-box profile-stat-box--distance">
            <div className="profile-stat-header">
              <span className="profile-stat-label">{lang === 'bn' ? 'মোট দূরত্ব' : 'Distance'}</span>
              <div className="profile-stat-icon-wrap" style={{ color: 'var(--mode-rickshaw)' }}>📏</div>
            </div>
            <div className="profile-stat-num">
              {num(stats.totalDistance || 0, lang)} <span style={{ fontSize: 13, color: 'var(--c70)' }}>{lang === 'bn' ? 'কিমি' : 'km'}</span>
            </div>
            <span className="profile-stat-subtext">{lang === 'bn' ? 'অতিক্রম করা পথ' : 'Distance in Transit'}</span>
          </div>

          <div className="profile-stat-box profile-stat-box--time">
            <div className="profile-stat-header">
              <span className="profile-stat-label">{lang === 'bn' ? 'যাতায়াত সময়' : 'Transit Time'}</span>
              <div className="profile-stat-icon-wrap" style={{ color: 'var(--stamp)' }}>⏱️</div>
            </div>
            <div className="profile-stat-num">
              {num(stats.totalMinutes || 0, lang)} <span style={{ fontSize: 13, color: 'var(--c70)' }}>{lang === 'bn' ? 'মিনিট' : 'mins'}</span>
            </div>
            <span className="profile-stat-subtext">{lang === 'bn' ? 'রাস্তায় অতিবাহিত' : 'Time Saved & Traveled'}</span>
          </div>

          <div className="profile-stat-box profile-stat-box--saved">
            <div className="profile-stat-header">
              <span className="profile-stat-label">{lang === 'bn' ? 'সংরক্ষিত আইটেম' : 'Saved Items'}</span>
              <div className="profile-stat-icon-wrap" style={{ color: 'var(--mode-bike)' }}>🔖</div>
            </div>
            <div className="profile-stat-num">
              {num(savedRoutes.length + favoriteStops.length, lang)}
            </div>
            <span className="profile-stat-subtext">{lang === 'bn' ? 'রুট ও পিন করা স্টপ' : 'Routes & Pinned Stops'}</span>
          </div>
        </div>

        {/* 4. NAVIGATION TABS */}
        <div className="profile-tabs-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'routes'}
            className={`profile-tab-btn ${activeTab === 'routes' ? 'profile-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('routes')}
          >
            <span>🛣️ {lang === 'bn' ? 'সংরক্ষিত রুট' : 'Saved Routes'}</span>
            <span className="profile-tab-badge">{num(savedRoutes.length, lang)}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'stops'}
            className={`profile-tab-btn ${activeTab === 'stops' ? 'profile-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('stops')}
          >
            <span>📍 {lang === 'bn' ? 'পছন্দের স্টেশন' : 'Favorite Stops'}</span>
            <span className="profile-tab-badge">{num(favoriteStops.length, lang)}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'trips'}
            className={`profile-tab-btn ${activeTab === 'trips' ? 'profile-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('trips')}
          >
            <span>🕒 {lang === 'bn' ? 'ভ্রমণ ইতিহাস' : 'Trip History'}</span>
            <span className="profile-tab-badge">{num(trips.length, lang)}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'settings'}
            className={`profile-tab-btn ${activeTab === 'settings' ? 'profile-tab-btn--active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <span>⚙️ {lang === 'bn' ? 'সেটিংস ও পছন্দ' : 'Settings & Preferences'}</span>
          </button>
        </div>

        {/* 5. TAB PANELS */}

        {/* TAB 1: SAVED ROUTES */}
        {activeTab === 'routes' && (
          <div className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">
                🛣️ {lang === 'bn' ? 'আপনার সংরক্ষিত যাতায়াত রুট' : 'Your Saved Commuter Routes'}
              </h2>
              <button
                type="button"
                className="action-chip action-chip--highlight"
                onClick={() => setShowAddRoute((prev) => !prev)}
              >
                {showAddRoute ? (lang === 'bn' ? '✕ ফর্ম বন্ধ করুন' : '✕ Close Form') : (lang === 'bn' ? '+ নতুন রুট যোগ করুন' : '+ Save New Route')}
              </button>
            </div>

            {/* Add Route Form */}
            {showAddRoute && (
              <form className="profile-inline-form" onSubmit={handleCreateRoute}>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--cream)' }}>
                  {lang === 'bn' ? 'নতুন যাতায়াত রুট সংরক্ষণ করুন' : 'Save a New Commuter Route'}
                </div>
                <div className="profile-form-grid">
                  <div className="profile-form-group">
                    <label className="profile-form-label">{lang === 'bn' ? 'রুটের নাম' : 'Route Name'}</label>
                    <input
                      type="text"
                      className="profile-form-input"
                      placeholder={lang === 'bn' ? 'যেমন: বাসা থেকে অফিস' : 'e.g. Home to Office'}
                      value={routeForm.name}
                      onChange={(e) => setRouteForm({ ...routeForm, name: e.target.value })}
                      required
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">{lang === 'bn' ? 'শুরুর স্থান (From)' : 'Origin (From)'}</label>
                    <input
                      type="text"
                      className="profile-form-input"
                      placeholder={lang === 'bn' ? 'যেমন: মিরপুর ১০' : 'e.g. Mirpur 10'}
                      value={routeForm.fromLocation}
                      onChange={(e) => setRouteForm({ ...routeForm, fromLocation: e.target.value })}
                      required
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">{lang === 'bn' ? 'গন্তব্য (To)' : 'Destination (To)'}</label>
                    <input
                      type="text"
                      className="profile-form-input"
                      placeholder={lang === 'bn' ? 'যেমন: মতিঝিল' : 'e.g. Motijheel'}
                      value={routeForm.toLocation}
                      onChange={(e) => setRouteForm({ ...routeForm, toLocation: e.target.value })}
                      required
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">{lang === 'bn' ? 'বাহন (Mode)' : 'Transport Mode'}</label>
                    <select
                      className="profile-form-input"
                      value={routeForm.mode}
                      onChange={(e) => setRouteForm({ ...routeForm, mode: e.target.value })}
                    >
                      <option value="metro">{lang === 'bn' ? 'মেট্রোরেল (Metro MRT-6)' : 'Metro MRT-6'}</option>
                      <option value="bus">{lang === 'bn' ? 'বাস (City Bus)' : 'City Bus'}</option>
                      <option value="rickshaw">{lang === 'bn' ? 'রিকশা (Rickshaw)' : 'Rickshaw'}</option>
                      <option value="bike">{lang === 'bn' ? 'বাইক (Ride Share)' : 'Bike'}</option>
                      <option value="cng">{lang === 'bn' ? 'সিএনজি (CNG Auto)' : 'CNG Auto'}</option>
                      <option value="walk">{lang === 'bn' ? 'হাঁটা (Walk)' : 'Walk'}</option>
                    </select>
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">{lang === 'bn' ? 'সময়কাল (মিনিট)' : 'Duration (mins)'}</label>
                    <input
                      type="number"
                      min="1"
                      className="profile-form-input"
                      placeholder={lang === 'bn' ? 'যেমন: ২৫' : 'e.g. 25'}
                      value={routeForm.durationMinutes}
                      onChange={(e) => setRouteForm({ ...routeForm, durationMinutes: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                  <button
                    type="button"
                    className="action-chip"
                    onClick={() => setShowAddRoute(false)}
                  >
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="action-chip action-chip--highlight"
                    disabled={isSavingRoute}
                    style={{ fontWeight: 700 }}
                  >
                    {isSavingRoute ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (lang === 'bn' ? '✓ রুট সেভ করুন' : '✓ Save Route')}
                  </button>
                </div>
              </form>
            )}

            {/* Saved Routes List */}
            {savedRoutes.length === 0 ? (
              <div className="profile-empty-box">
                <div className="profile-empty-icon">🛣️</div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cream)' }}>
                  {lang === 'bn' ? 'এখনও কোনো রুট সংরক্ষণ করা হয়নি' : 'No saved routes yet'}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--c70)', maxWidth: 420 }}>
                  {lang === 'bn'
                    ? 'নিয়মিত যাতায়াতের রুটগুলো এখানে সেভ করে রাখুন এবং পরবর্তীতে ১-ক্লিকেই ম্যাপে নেভিগেশন চালু করুন।'
                    : 'Bookmark your frequent daily routes here and launch navigation on the map with a single tap.'}
                </p>
              </div>
            ) : (
              <div>
                {savedRoutes.map((route) => (
                  <div key={route.id} className="profile-route-card">
                    <div className="profile-route-left">
                      <div className="profile-route-mode-icon">
                        <ModeIcon mode={route.mode || 'metro'} size={22} />
                      </div>

                      <div className="profile-route-details">
                        <h3 className="profile-route-name">{route.name}</h3>
                        <div className="profile-route-path">
                          <span className="profile-route-path-dot profile-route-path-dot--from" />
                          <span>{route.fromLocation}</span>
                          <span style={{ color: 'var(--c45)' }}>──→</span>
                          <span className="profile-route-path-dot profile-route-path-dot--to" />
                          <span>{route.toLocation}</span>
                          {route.durationMinutes ? (
                            <span className="profile-trip-pill" style={{ marginLeft: 6 }}>
                              ~{num(route.durationMinutes, lang)} {lang === 'bn' ? 'মিনিট' : 'mins'}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="profile-route-actions">
                      <button
                        type="button"
                        className="action-chip action-chip--highlight"
                        onClick={() => handleUseRoute(route)}
                        title="Launch this route on the map"
                        style={{ fontWeight: 700 }}
                      >
                        🚀 {lang === 'bn' ? 'ম্যাপে চালান' : 'Use in Map'}
                      </button>
                      <button
                        type="button"
                        className="action-chip action-chip--logout"
                        onClick={() => handleDeleteRoute(route.id)}
                        title="Delete Route"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: FAVORITE STOPS */}
        {activeTab === 'stops' && (
          <div className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">
                📍 {lang === 'bn' ? 'আপনার পছন্দের স্টেশন ও স্টপসমূহ' : 'Your Favorite Transit Stops'}
              </h2>
              <button
                type="button"
                className="action-chip action-chip--highlight"
                onClick={() => setShowAddStop((prev) => !prev)}
              >
                {showAddStop ? (lang === 'bn' ? '✕ ফর্ম বন্ধ করুন' : '✕ Close Form') : (lang === 'bn' ? '+ নতুন স্টপ পিন করুন' : '+ Pin New Stop')}
              </button>
            </div>

            {/* Add Stop Form */}
            {showAddStop && (
              <form className="profile-inline-form" onSubmit={handleCreateStop}>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--cream)' }}>
                  {lang === 'bn' ? 'পছন্দের স্টেশন বা স্টপ যুক্ত করুন' : 'Add a Favorite Station or Bus Stop'}
                </div>
                <div className="profile-form-grid">
                  <div className="profile-form-group">
                    <label className="profile-form-label">{lang === 'bn' ? 'স্টেশনের নাম' : 'Stop / Station Name'}</label>
                    <input
                      type="text"
                      className="profile-form-input"
                      placeholder={lang === 'bn' ? 'যেমন: মিরপুর ১০ মেট্রোরেল স্টেশন' : 'e.g. Mirpur 10 Metro'}
                      value={stopForm.name}
                      onChange={(e) => setStopForm({ ...stopForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="profile-form-group">
                    <label className="profile-form-label">{lang === 'bn' ? 'নোড / স্টেশন কোড (ঐচ্ছিক)' : 'Node / Station Code (Optional)'}</label>
                    <input
                      type="text"
                      className="profile-form-input"
                      placeholder={lang === 'bn' ? 'যেমন: mrt_mirpur_10' : 'e.g. mrt_mirpur_10'}
                      value={stopForm.nodeId}
                      onChange={(e) => setStopForm({ ...stopForm, nodeId: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    type="button"
                    className="action-chip"
                    onClick={() => setShowAddStop(false)}
                  >
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="action-chip action-chip--highlight"
                    disabled={isAddingStop}
                    style={{ fontWeight: 700 }}
                  >
                    {isAddingStop ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (lang === 'bn' ? '✓ পিন করুন' : '✓ Pin Stop')}
                  </button>
                </div>
              </form>
            )}

            {/* Quick Pick Stations (All 16 Real MRT-6 Stations) */}
            <div className="profile-quick-stations-wrap">
              <div className="profile-quick-stations-title">
                <span>⚡</span>
                <span>{lang === 'bn' ? '১-ক্লিকে মেট্রো স্টেশন পিন করুন:' : '1-Click Pin Metro Stations:'}</span>
              </div>
              <div className="profile-quick-stations-chips">
                {MRT6_STATIONS.map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    className="profile-quick-station-btn"
                    onClick={() => handleQuickAddStation(st)}
                  >
                    + {lang === 'bn' ? st.nameBn : st.nameEn}
                  </button>
                ))}
              </div>
            </div>

            {/* Favorite Stops List */}
            {favoriteStops.length === 0 ? (
              <div className="profile-empty-box" style={{ marginTop: 18 }}>
                <div className="profile-empty-icon">📍</div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cream)' }}>
                  {lang === 'bn' ? 'এখনও কোনো স্টেশন পিন করা হয়নি' : 'No favorite stops pinned yet'}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--c70)', maxWidth: 420 }}>
                  {lang === 'bn'
                    ? 'উপরের তালিকা থেকে যেকোনো মেট্রো স্টেশন পিন করুন অথবা আপনার পছন্দের স্টপ যুক্ত করুন।'
                    : 'Pin your most used MRT-6 stations above or add custom stops.'}
                </p>
              </div>
            ) : (
              <div style={{ marginTop: 18 }}>
                {favoriteStops.map((stop) => (
                  <div key={stop.id} className="profile-stop-card">
                    <div className="profile-stop-left">
                      <div className="profile-stop-badge">🚇</div>
                      <div>
                        <h3 className="profile-stop-name">{stop.name}</h3>
                        {stop.nodeId ? (
                          <p className="profile-stop-id">Node: #{stop.nodeId}</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="profile-route-actions">
                      <button
                        type="button"
                        className="action-chip action-chip--highlight"
                        onClick={() => handleUseStopAsDestination(stop)}
                        title="Set this stop as destination on the map"
                        style={{ fontWeight: 700 }}
                      >
                        🧭 {lang === 'bn' ? 'গন্তব্য সেট' : 'Set Destination'}
                      </button>
                      <button
                        type="button"
                        className="action-chip"
                        onClick={() => handleUseStopAsOrigin(stop)}
                        title="Set this stop as origin on the map"
                      >
                        🛫 {lang === 'bn' ? 'উৎস সেট' : 'Set Origin'}
                      </button>
                      <button
                        type="button"
                        className="action-chip action-chip--logout"
                        onClick={() => handleDeleteStop(stop.id)}
                        title="Remove Stop"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: TRIP HISTORY */}
        {activeTab === 'trips' && (
          <div className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">
                🕒 {lang === 'bn' ? 'আপনার ভ্রমণ ইতিহাস' : 'Your Journey History'}
              </h2>
              <button
                type="button"
                className="action-chip action-chip--highlight"
                onClick={() => navigate('/map')}
              >
                🗺️ {lang === 'bn' ? 'নতুন ট্রিপ খুঁজুন' : 'Plan New Trip'}
              </button>
            </div>

            {trips.length === 0 ? (
              <div className="profile-empty-box">
                <div className="profile-empty-icon">🧭</div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cream)' }}>
                  {lang === 'bn' ? 'কোনো ভ্রমণের তথ্য পাওয়া যায়নি' : 'No journey history found'}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--c70)', maxWidth: 420 }}>
                  {lang === 'bn'
                    ? 'ম্যাপে রুট সার্চ করুন বা লাইভ জার্নি শুরু করলে আপনার সম্পন্ন করা ট্রিপগুলো স্বয়ংক্রিয়ভাবে এখানে জমা হবে।'
                    : 'Search routes on the map or launch a live journey to record your transit history automatically.'}
                </p>
              </div>
            ) : (
              <div>
                {trips.map((trip) => (
                  <div key={trip.id} className="profile-trip-item">
                    <div className="profile-trip-left">
                      <div className="profile-trip-mode-icon">
                        <ModeIcon mode={trip.mode || 'bus'} size={20} />
                      </div>

                      <div>
                        <h3 className="profile-trip-title">
                          <span>{trip.fromLocation}</span>
                          <span style={{ color: 'var(--c45)', margin: '0 6px' }}>→</span>
                          <span>{trip.toLocation}</span>
                        </h3>
                        <div className="profile-trip-meta">
                          {trip.distanceKm ? (
                            <span className="profile-trip-pill">
                              📏 {num(trip.distanceKm, lang)} {lang === 'bn' ? 'কিমি' : 'km'}
                            </span>
                          ) : null}
                          {trip.durationMinutes ? (
                            <span className="profile-trip-pill">
                              ⏱️ {num(trip.durationMinutes, lang)} {lang === 'bn' ? 'মিনিট' : 'mins'}
                            </span>
                          ) : null}
                          <span className="profile-tag profile-tag--verified">
                            ✓ {lang === 'bn' ? 'সম্পন্ন' : 'Completed'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ fontSize: 12.5, color: 'var(--c70)', fontFamily: 'var(--data)' }}>
                      🕒 {formatTimeAgo(trip.completedAt || trip.createdAt, lang)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SETTINGS & PREFERENCES */}
        {activeTab === 'settings' && (
          <div className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">
                ⚙️ {lang === 'bn' ? 'অ্যাকাউন্ট সেটিংস ও পছন্দসমূহ' : 'Account Settings & Preferences'}
              </h2>
            </div>

            <div className="profile-settings-grid">
              {/* Personal Info Edit Block */}
              <div className="profile-settings-block">
                <h3 className="profile-settings-title">
                  👤 {lang === 'bn' ? 'ব্যক্তিগত তথ্য' : 'Personal Information'}
                </h3>

                {isEditing ? (
                  <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="profile-form-group">
                      <label className="profile-form-label">{lang === 'bn' ? 'নাম' : 'Full Name'}</label>
                      <input
                        type="text"
                        className="profile-form-input"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        required
                      />
                    </div>

                    <div className="profile-form-group">
                      <label className="profile-form-label">{lang === 'bn' ? 'ইমেইল অ্যাড্রেস' : 'Email Address'}</label>
                      <input
                        type="email"
                        className="profile-form-input"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        disabled={isGoogle}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button
                        type="button"
                        className="action-chip"
                        onClick={() => setIsEditing(false)}
                      >
                        {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className="action-chip action-chip--highlight"
                        disabled={isUpdating}
                        style={{ fontWeight: 700 }}
                      >
                        {isUpdating ? (lang === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...') : (lang === 'bn' ? '✓ পরিবর্তন সেভ করুন' : '✓ Save Changes')}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div className="profile-info-row">
                      <span style={{ color: 'var(--c70)' }}>{lang === 'bn' ? 'নাম:' : 'Name:'}</span>
                      <span style={{ fontWeight: 700, color: 'var(--cream)' }}>{currentUser?.name}</span>
                    </div>
                    <div className="profile-info-row">
                      <span style={{ color: 'var(--c70)' }}>{lang === 'bn' ? 'ইমেইল:' : 'Email:'}</span>
                      <span style={{ fontFamily: 'var(--data)', color: 'var(--cream)' }}>{currentUser?.email || (lang === 'bn' ? 'যুক্ত নেই' : 'N/A')}</span>
                    </div>

                    <button
                      type="button"
                      className="action-chip"
                      style={{ alignSelf: 'flex-start', marginTop: 6 }}
                      onClick={() => setIsEditing(true)}
                    >
                      ✏️ {lang === 'bn' ? 'তথ্য পরিবর্তন করুন' : 'Edit Information'}
                    </button>
                  </div>
                )}
              </div>

              {/* App Preferences (Theme & Language) */}
              <div className="profile-settings-block">
                <h3 className="profile-settings-title">
                  🎨 {lang === 'bn' ? 'অ্যাপ পছন্দসমূহ' : 'App Preferences'}
                </h3>

                <div>
                  <label className="profile-form-label" style={{ marginBottom: 8, display: 'block' }}>
                    {lang === 'bn' ? 'থিম নির্বাচন (Theme)' : 'Color Theme'}
                  </label>
                  <div className="profile-choice-cards">
                    <button
                      type="button"
                      className={`profile-choice-card ${theme === 'light' ? 'profile-choice-card--active' : ''}`}
                      onClick={() => setTheme('light')}
                    >
                      <span style={{ fontSize: 20 }}>☀️</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{lang === 'bn' ? 'দিন (Light)' : 'Light Mode'}</span>
                    </button>

                    <button
                      type="button"
                      className={`profile-choice-card ${theme === 'dark' ? 'profile-choice-card--active' : ''}`}
                      onClick={() => setTheme('dark')}
                    >
                      <span style={{ fontSize: 20 }}>🌙</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{lang === 'bn' ? 'রাত (Dark)' : 'Dark Mode'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 6 }}>
                  <label className="profile-form-label" style={{ marginBottom: 8, display: 'block' }}>
                    {lang === 'bn' ? 'ভাষা নির্বাচন (Language)' : 'Language'}
                  </label>
                  <div className="profile-choice-cards">
                    <button
                      type="button"
                      className={`profile-choice-card ${lang === 'bn' ? 'profile-choice-card--active' : ''}`}
                      onClick={() => setLang('bn')}
                    >
                      <span style={{ fontSize: 18 }}>🇧🇩</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>বাংলা</span>
                    </button>

                    <button
                      type="button"
                      className={`profile-choice-card ${lang === 'en' ? 'profile-choice-card--active' : ''}`}
                      onClick={() => setLang('en')}
                    >
                      <span style={{ fontSize: 18 }}>🇬🇧</span>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>English</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Security & Access */}
              <div className="profile-settings-block" style={{ gridColumn: '1 / -1' }}>
                <h3 className="profile-settings-title">
                  🔒 {lang === 'bn' ? 'অ্যাকাউন্ট নিরাপত্তা ও সেশন' : 'Security & Access'}
                </h3>

                <div className="profile-security-box">
                  <div>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--cream)' }}>
                      {isGuest
                        ? (lang === 'bn' ? 'গেস্ট সেশনকে স্থায়ী অ্যাকাউন্টে রূপান্তর করুন' : 'Upgrade Guest Session to Permanent Account')
                        : (lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন বা রিসেট করুন' : 'Change or Reset Account Password')}
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--c70)' }}>
                      {isGuest
                        ? (lang === 'bn' ? 'আপনার ডেটা আজীবন সংরক্ষণ করতে একটি ইমেইল ও পাসওয়ার্ড দিয়ে নিবন্ধন করুন।' : 'Secure your commuter data across all devices by registering with email and password.')
                        : (lang === 'bn' ? 'ইমেইল ভেরিফিকেশন কোডের মাধ্যমে নিরাপদে নতুন পাসওয়ার্ড তৈরি করুন।' : 'Reset your password securely via OTP email verification.')}
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {isGuest ? (
                      <button
                        type="button"
                        className="action-chip action-chip--highlight"
                        onClick={() => navigate('/register')}
                        style={{ fontWeight: 700 }}
                      >
                        ✨ {lang === 'bn' ? 'অ্যাকাউন্ট রেজিস্টার করুন' : 'Register Account'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="action-chip"
                        onClick={() => navigate('/forgot-password')}
                      >
                        🔑 {lang === 'bn' ? 'পাসওয়ার্ড রিসেট' : 'Reset Password'}
                      </button>
                    )}

                    <button
                      type="button"
                      className="action-chip action-chip--logout"
                      onClick={onLogout}
                    >
                      {lang === 'bn' ? 'লগআউট করুন' : 'Log Out'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
