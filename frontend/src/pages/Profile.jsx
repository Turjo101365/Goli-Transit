import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  createTrip,
  deleteTrip,
  clearTrips,
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

const TRANSIT_AVATAR_PRESETS = [
  { id: 'preset:metro', icon: '🚇', bn: 'মেট্রো মাস্টার', en: 'Metro Master' },
  { id: 'preset:bus', icon: '🚌', bn: 'সিটি বাস', en: 'City Bus' },
  { id: 'preset:rickshaw', icon: '🛺', bn: 'ঢাকা রিকশা', en: 'Dhaka Rickshaw' },
  { id: 'preset:cng', icon: '🚕', bn: 'গ্রিন সিএনজি', en: 'Green CNG' },
  { id: 'preset:train', icon: '🚆', bn: 'রেল কমিউটার', en: 'Rail Commuter' },
  { id: 'preset:bike', icon: '🛵', bn: 'বাইক রাইডার', en: 'Bike Rider' },
  { id: 'preset:walk', icon: '🚶', bn: 'পথচারী', en: 'Swift Walker' },
  { id: 'preset:captain', icon: '🛡️', bn: 'ট্রানজিট ক্যাপটেন', en: 'Transit Captain' }
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
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState(() => ((user?.role === 'admin' || user?.role === 'moderator') ? 'settings' : 'routes'));
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Edit Profile Form State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    avatarUrl: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Avatar Modal State
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');

  // Password Change State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  // Delete Account State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Add Route State
  const [showAddRoute, setShowAddRoute] = useState(false);
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [routeForm, setRouteForm] = useState({
    name: '',
    fromLocation: '',
    toLocation: '',
    mode: 'metro',
    durationMinutes: ''
  });

  // Add Stop State
  const [showAddStop, setShowAddStop] = useState(false);
  const [isAddingStop, setIsAddingStop] = useState(false);
  const [stopForm, setStopForm] = useState({
    name: '',
    nodeId: ''
  });

  // Log Trip State
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [tripForm, setTripForm] = useState({
    fromLocation: '',
    toLocation: '',
    mode: 'metro',
    distanceKm: '',
    durationMinutes: '',
    status: 'completed'
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
        const userData = data?.user || user;
        if (userData?.role === 'admin' || userData?.role === 'moderator') {
          setActiveTab('settings');
        }
        setEditForm({
          name: userData?.name || '',
          email: userData?.email || '',
          phone: userData?.phone || '',
          bio: userData?.bio || '',
          avatarUrl: userData?.avatarUrl || ''
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
      const userData = data?.user || user;
      setEditForm({
        name: userData?.name || '',
        email: userData?.email || '',
        phone: userData?.phone || '',
        bio: userData?.bio || '',
        avatarUrl: userData?.avatarUrl || ''
      });
      setSuccessMessage(lang === 'bn' ? 'প্রোফাইল ডেটা সিঙ্ক হয়েছে' : 'Profile data synchronized with database');
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
      setError(null);
      const result = await updateProfile(editForm);
      const updatedUser = result.user || result;
      setProfileData((prev) => ({ ...prev, user: updatedUser }));
      const token = getStoredAuthToken();
      if (token) saveStoredSession({ token, user: updatedUser });
      if (onUpdateUser) onUpdateUser(updatedUser);
      setIsEditing(false);
      setSuccessMessage(lang === 'bn' ? 'প্রোফাইল তথ্য সফলভাবে সংরক্ষিত হয়েছে' : 'Profile updated successfully in database');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleAvatarPresetSelect(presetId) {
    try {
      setEditForm((prev) => ({ ...prev, avatarUrl: presetId }));
      const payload = {
        name: editForm.name || profileData?.user?.name || user?.name,
        email: editForm.email || profileData?.user?.email || user?.email,
        phone: editForm.phone || profileData?.user?.phone || null,
        bio: editForm.bio || profileData?.user?.bio || null,
        avatarUrl: presetId
      };
      const result = await updateProfile(payload);
      const updatedUser = result.user || result;
      setProfileData((prev) => ({ ...prev, user: updatedUser }));
      const token = getStoredAuthToken();
      if (token) saveStoredSession({ token, user: updatedUser });
      if (onUpdateUser) onUpdateUser(updatedUser);
      setAvatarModalOpen(false);
      setSuccessMessage(lang === 'bn' ? 'প্রোফাইল ছবি পরিবর্তন করা হয়েছে' : 'Profile picture updated');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCustomAvatarSubmit(e) {
    e.preventDefault();
    if (!customAvatarUrl) return;
    try {
      setEditForm((prev) => ({ ...prev, avatarUrl: customAvatarUrl }));
      const payload = {
        name: editForm.name || profileData?.user?.name || user?.name,
        email: editForm.email || profileData?.user?.email || user?.email,
        phone: editForm.phone || profileData?.user?.phone || null,
        bio: editForm.bio || profileData?.user?.bio || null,
        avatarUrl: customAvatarUrl
      };
      const result = await updateProfile(payload);
      const updatedUser = result.user || result;
      setProfileData((prev) => ({ ...prev, user: updatedUser }));
      const token = getStoredAuthToken();
      if (token) saveStoredSession({ token, user: updatedUser });
      if (onUpdateUser) onUpdateUser(updatedUser);
      setAvatarModalOpen(false);
      setCustomAvatarUrl('');
      setSuccessMessage(lang === 'bn' ? 'প্রোফাইল ছবি পরিবর্তন করা হয়েছে' : 'Profile picture updated');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError(lang === 'bn' ? 'ছবির সাইজ ২MB এর কম হতে হবে' : 'Image size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUri = reader.result;
      try {
        const payload = {
          name: editForm.name || profileData?.user?.name || user?.name,
          email: editForm.email || profileData?.user?.email || user?.email,
          phone: editForm.phone || profileData?.user?.phone || null,
          bio: editForm.bio || profileData?.user?.bio || null,
          avatarUrl: dataUri
        };
        const result = await updateProfile(payload);
        const updatedUser = result.user || result;
        setProfileData((prev) => ({ ...prev, user: updatedUser }));
        const token = getStoredAuthToken();
        if (token) saveStoredSession({ token, user: updatedUser });
        if (onUpdateUser) onUpdateUser(updatedUser);
        setAvatarModalOpen(false);
        setSuccessMessage(lang === 'bn' ? 'প্রোফাইল ছবি আপলোড সম্পন্ন হয়েছে' : 'Profile photo uploaded successfully');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        setError(err.message);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleChangePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordError(lang === 'bn' ? 'নতুন পাসওয়ার্ড দুটি মিলছে না' : 'New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError(lang === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters');
      return;
    }

    try {
      setIsChangingPassword(true);
      const result = await changePassword({
        currentPassword: passwordForm.currentPassword || null,
        newPassword: passwordForm.newPassword,
        confirmNewPassword: passwordForm.confirmNewPassword
      });
      setPasswordMessage(result?.message || (lang === 'bn' ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে' : 'Password updated successfully'));
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setTimeout(() => setPasswordMessage(null), 4000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  }

  async function handleDeleteAccountSubmit(e) {
    e.preventDefault();
    try {
      setIsDeletingAccount(true);
      await deleteAccount({ password: deletePassword || null });
      setDeleteModalOpen(false);
      if (onLogout) onLogout();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setIsDeletingAccount(false);
    }
  }

  async function handleCreateTrip(e) {
    e.preventDefault();
    if (!tripForm.fromLocation || !tripForm.toLocation) return;
    try {
      setIsSavingTrip(true);
      const result = await createTrip({
        fromLocation: tripForm.fromLocation,
        toLocation: tripForm.toLocation,
        mode: tripForm.mode,
        distanceKm: tripForm.distanceKm ? Number(tripForm.distanceKm) : null,
        durationMinutes: tripForm.durationMinutes ? Number(tripForm.durationMinutes) : null,
        status: tripForm.status || 'completed'
      });
      const newTrip = {
        id: result.id || Date.now(),
        fromLocation: tripForm.fromLocation,
        toLocation: tripForm.toLocation,
        mode: tripForm.mode,
        distanceKm: tripForm.distanceKm ? Number(tripForm.distanceKm) : null,
        durationMinutes: tripForm.durationMinutes ? Number(tripForm.durationMinutes) : null,
        status: tripForm.status || 'completed',
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      setProfileData((prev) => ({
        ...prev,
        trips: [newTrip, ...(prev?.trips || [])],
        stats: {
          ...prev?.stats,
          totalTrips: (prev?.stats?.totalTrips || 0) + 1,
          totalDistance: (prev?.stats?.totalDistance || 0) + Number(tripForm.distanceKm || 0),
          totalMinutes: (prev?.stats?.totalMinutes || 0) + Number(tripForm.durationMinutes || 0)
        }
      }));
      setTripForm({ fromLocation: '', toLocation: '', mode: 'metro', distanceKm: '', durationMinutes: '', status: 'completed' });
      setShowAddTrip(false);
      setSuccessMessage(lang === 'bn' ? 'ভ্রমণ সফলভাবে ডাটাবেজে যুক্ত হয়েছে' : 'Trip logged in database successfully');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSavingTrip(false);
    }
  }

  async function handleDeleteTrip(tripId) {
    try {
      await deleteTrip(tripId);
      setProfileData((prev) => ({
        ...prev,
        trips: (prev?.trips || []).filter((t) => t.id !== tripId)
      }));
      setSuccessMessage(lang === 'bn' ? 'ভ্রমণ ইতিহাস থেকে মুছে ফেলা হয়েছে' : 'Trip removed from database');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleClearAllTrips() {
    if (!window.confirm(lang === 'bn' ? 'আপনি কি সমস্ত ভ্রমণ ইতিহাস ডাটাবেজ থেকে মুছে ফেলতে চান?' : 'Are you sure you want to clear all your journey history from the database?')) {
      return;
    }
    try {
      await clearTrips();
      setProfileData((prev) => ({
        ...prev,
        trips: [],
        stats: {
          ...prev?.stats,
          totalTrips: 0,
          totalDistance: 0,
          totalMinutes: 0
        }
      }));
      setSuccessMessage(lang === 'bn' ? 'সমস্ত ভ্রমণ ইতিহাস মুছে ফেলা হয়েছে' : 'All journey history cleared');
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err) {
      setError(err.message || 'Failed to clear trips');
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
      setSuccessMessage(lang === 'bn' ? 'রুট সফলভাবে ডাটাবেজে সংরক্ষিত হয়েছে' : 'Route saved in database');
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
      setSuccessMessage(lang === 'bn' ? 'রুট মুছে ফেলা হয়েছে' : 'Route removed from database');
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
      setSuccessMessage(lang === 'bn' ? 'স্টপ তালিকা থেকে সরানো হয়েছে' : 'Stop unpinned from database');
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

  const userAvatarUrl = currentUser?.avatarUrl;
  const matchedPreset = TRANSIT_AVATAR_PRESETS.find((p) => p.id === userAvatarUrl);

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
            <div
              className="profile-avatar-wrap profile-avatar-clickable"
              onClick={() => setAvatarModalOpen(true)}
              title={lang === 'bn' ? 'প্রোফাইল ছবি পরিবর্তন করতে ক্লিক করুন' : 'Click to change profile picture'}
            >
              <div className={`profile-avatar ${isGuest ? 'profile-avatar--guest' : ''}`}>
                {matchedPreset ? (
                  <span style={{ fontSize: 32 }}>{matchedPreset.icon}</span>
                ) : userAvatarUrl && (userAvatarUrl.startsWith('http') || userAvatarUrl.startsWith('data:image')) ? (
                  <img src={userAvatarUrl} alt={currentUser?.name} className="profile-avatar-img" />
                ) : (
                  initialLetter
                )}
              </div>
              <div className="profile-avatar-edit-overlay">
                📷 {lang === 'bn' ? 'বদলান' : 'Edit'}
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
                {currentUser?.role === 'admin' && (
                  <span className="profile-tag" style={{ background: 'rgba(0,103,71,0.2)', color: 'var(--metro)', borderColor: 'var(--metro)' }}>
                    🛡️ {lang === 'bn' ? 'সিস্টেম অ্যাডমিন' : 'Admin'}
                  </span>
                )}
              </div>

              <div className="profile-hero-rank">
                <span>🚇</span>
                <span>
                  {currentUser?.bio || (lang === 'bn' ? 'ঢাকা ট্রানজিট যাত্রী · সক্রিয় যাতায়াতকারী' : 'Dhaka Transit Commuter · Active Transit User')}
                </span>
              </div>

              <p className="profile-hero-email">
                📧 {currentUser?.email || (lang === 'bn' ? 'কোনো ইমেইল যুক্ত নেই (অস্থায়ী)' : 'No email associated (Temporary)')}
                {currentUser?.phone ? (
                  <span style={{ marginLeft: 12, color: 'var(--c70)' }}>
                    📱 {currentUser.phone}
                  </span>
                ) : null}
              </p>

              <div className="profile-meta-row">
                <span>
                  {lang === 'bn' ? 'যুক্ত হয়েছেন: ' : 'Member since: '}
                  <strong>{formatDate(currentUser?.createdAt, lang)}</strong>
                </span>

                {currentUser?.lastLoginAt ? (
                  <span style={{ marginLeft: 10, color: 'var(--c70)' }}>
                    {lang === 'bn' ? 'শেষ লগইন: ' : 'Last active: '}
                    <strong>{formatTimeAgo(currentUser.lastLoginAt, lang)}</strong>
                  </span>
                ) : null}

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
                🔒 {lang === 'bn' ? 'স্থায়ী ডাটাবেজ ব্যাকআপ' : 'Permanent Database Storage'}
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

        {/* 3. COMMUTER TRAVEL METRICS GRID (Only for commuters/non-admin) */}
        {!isAdmin && (
          <div className="profile-stats-grid">
            <div className="profile-stat-box profile-stat-box--metro">
              <div className="profile-stat-header">
                <span className="profile-stat-label">{lang === 'bn' ? 'মোট ট্রিপ' : 'Total Trips'}</span>
                <div className="profile-stat-icon-wrap" style={{ color: 'var(--metro)' }}>🚇</div>
              </div>
              <div className="profile-stat-num">{num(stats.totalTrips || trips.length || 0, lang)}</div>
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
        )}

        {/* 4. NAVIGATION TABS (Only for commuters/non-admin) */}
        {!isAdmin && (
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
              <span>⚙️ {lang === 'bn' ? 'সেটিংস ও নিরাপত্তা' : 'Settings & Security'}</span>
            </button>
          </div>
        )}

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
                  {lang === 'bn' ? 'এখনও কোনো রুট সংরক্ষণ করা হয়নি' : 'No saved routes yet in database'}
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
                🕒 {lang === 'bn' ? 'আপনার ভ্রমণ ইতিহাস' : 'Your Journey History (Database Records)'}
              </h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {trips.length > 0 && (
                  <button
                    type="button"
                    className="action-chip action-chip--logout"
                    onClick={handleClearAllTrips}
                    title={lang === 'bn' ? 'ডাটাবেজ থেকে সমস্ত ভ্রমণ ইতিহাস মুছুন' : 'Clear all journey history from database'}
                  >
                    🗑️ {lang === 'bn' ? 'সব মুছুন' : 'Clear All'}
                  </button>
                )}
                <button
                  type="button"
                  className="action-chip"
                  onClick={() => setShowAddTrip((prev) => !prev)}
                >
                  {showAddTrip ? (lang === 'bn' ? '✕ ফর্ম বন্ধ' : '✕ Close') : (lang === 'bn' ? '+ ভ্রমণ লগ করুন' : '+ Log Trip')}
                </button>
                <button
                  type="button"
                  className="action-chip action-chip--highlight"
                  onClick={() => navigate('/map')}
                  style={{ fontWeight: 700 }}
                >
                  🗺️ {lang === 'bn' ? 'নতুন ট্রিপ খুঁজুন' : 'Plan New Trip'}
                </button>
              </div>
            </div>

            {/* Manual Trip Logging Form */}
            {showAddTrip && (
              <form className="profile-inline-form" onSubmit={handleCreateTrip}>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--cream)' }}>
                  {lang === 'bn' ? 'ডাটাবেজে নতুন ভ্রমণ রেকর্ড করুন' : 'Log a Journey to Database'}
                </div>
                <div className="profile-form-grid">
                  <div className="profile-form-group">
                    <label className="profile-form-label">{lang === 'bn' ? 'শুরুর স্থান (Origin)' : 'Origin'}</label>
                    <input
                      type="text"
                      className="profile-form-input"
                      placeholder={lang === 'bn' ? 'যেমন: উত্তরা উত্তর' : 'e.g. Uttara North'}
                      value={tripForm.fromLocation}
                      onChange={(e) => setTripForm({ ...tripForm, fromLocation: e.target.value })}
                      required
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">{lang === 'bn' ? 'গন্তব্য (Destination)' : 'Destination'}</label>
                    <input
                      type="text"
                      className="profile-form-input"
                      placeholder={lang === 'bn' ? 'যেমন: মতিঝিল' : 'e.g. Motijheel'}
                      value={tripForm.toLocation}
                      onChange={(e) => setTripForm({ ...tripForm, toLocation: e.target.value })}
                      required
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">{lang === 'bn' ? 'বাহন (Mode)' : 'Mode'}</label>
                    <select
                      className="profile-form-input"
                      value={tripForm.mode}
                      onChange={(e) => setTripForm({ ...tripForm, mode: e.target.value })}
                    >
                      <option value="metro">{lang === 'bn' ? 'মেট্রোরেল (Metro MRT-6)' : 'Metro MRT-6'}</option>
                      <option value="bus">{lang === 'bn' ? 'বাস (City Bus)' : 'City Bus'}</option>
                      <option value="rickshaw">{lang === 'bn' ? 'রিকশা (Rickshaw)' : 'Rickshaw'}</option>
                      <option value="cng">{lang === 'bn' ? 'সিএনজি (CNG Auto)' : 'CNG Auto'}</option>
                      <option value="bike">{lang === 'bn' ? 'বাইক (Ride Share)' : 'Bike'}</option>
                      <option value="walk">{lang === 'bn' ? 'হাঁটা (Walk)' : 'Walk'}</option>
                    </select>
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">{lang === 'bn' ? 'দূরত্ব (কিমি)' : 'Distance (km)'}</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      className="profile-form-input"
                      placeholder="e.g. 12.5"
                      value={tripForm.distanceKm}
                      onChange={(e) => setTripForm({ ...tripForm, distanceKm: e.target.value })}
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">{lang === 'bn' ? 'সময় (মিনিট)' : 'Duration (mins)'}</label>
                    <input
                      type="number"
                      min="1"
                      className="profile-form-input"
                      placeholder="e.g. 30"
                      value={tripForm.durationMinutes}
                      onChange={(e) => setTripForm({ ...tripForm, durationMinutes: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
                  <button
                    type="button"
                    className="action-chip"
                    onClick={() => setShowAddTrip(false)}
                  >
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="action-chip action-chip--highlight"
                    disabled={isSavingTrip}
                    style={{ fontWeight: 700 }}
                  >
                    {isSavingTrip ? (lang === 'bn' ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (lang === 'bn' ? '✓ ট্রিপ যুক্ত করুন' : '✓ Save Trip')}
                  </button>
                </div>
              </form>
            )}

            {trips.length === 0 ? (
              <div className="profile-empty-box">
                <div className="profile-empty-icon">🧭</div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cream)' }}>
                  {lang === 'bn' ? 'ডাটাবেজে কোনো ভ্রমণের তথ্য পাওয়া যায়নি' : 'No journey history found in database'}
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 12.5, color: 'var(--c70)', fontFamily: 'var(--data)' }}>
                        🕒 {formatTimeAgo(trip.completedAt || trip.createdAt, lang)}
                      </div>
                      <button
                        type="button"
                        className="action-chip action-chip--highlight"
                        style={{ padding: '5px 12px', fontSize: 12, fontWeight: 700 }}
                        onClick={() => handleUseRoute(trip)}
                        title={lang === 'bn' ? 'পুনরায় ম্যাপে এই রুট চালু করুন' : 'Plan this route again on the map'}
                      >
                        🚀 {lang === 'bn' ? 'ম্যাপে চালান' : 'Plan on Map'}
                      </button>
                      <button
                        type="button"
                        className="action-chip action-chip--logout"
                        style={{ padding: '5px 10px' }}
                        onClick={() => handleDeleteTrip(trip.id)}
                        title="Delete Trip Log"
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

        {/* TAB 4: SETTINGS & SECURITY */}
        {activeTab === 'settings' && (
          <div className="profile-card">
            <div className="profile-card-header">
              <h2 className="profile-card-title">
                ⚙️ {lang === 'bn' ? 'অ্যাকাউন্ট সেটিংস ও নিরাপত্তা' : 'Account Settings & Security'}
              </h2>
            </div>

            <div className="profile-settings-grid">
              {/* Personal Info Edit Block */}
              <div className="profile-settings-block">
                <h3 className="profile-settings-title">
                  👤 {lang === 'bn' ? 'ব্যক্তিগত প্রোফাইল তথ্য' : 'Personal Profile Information'}
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

                    <div className="profile-form-group">
                      <label className="profile-form-label">{lang === 'bn' ? 'ফোন নম্বর' : 'Phone Number'}</label>
                      <input
                        type="tel"
                        className="profile-form-input"
                        placeholder={lang === 'bn' ? 'যেমন: 017xxxxxxxx' : 'e.g. 017xxxxxxxx'}
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      />
                    </div>

                    <div className="profile-form-group">
                      <label className="profile-form-label">{lang === 'bn' ? 'বায়ো / পরিচয়' : 'Bio / Short Note'}</label>
                      <input
                        type="text"
                        className="profile-form-input"
                        placeholder={lang === 'bn' ? 'যেমন: নিয়মিত মিরপুর-মতিঝিল যাত্রী' : 'e.g. Regular Mirpur to Motijheel commuter'}
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
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
                        {isUpdating ? (lang === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...') : (lang === 'bn' ? '✓ ডাটাবেজে সেভ করুন' : '✓ Save Changes')}
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
                    <div className="profile-info-row">
                      <span style={{ color: 'var(--c70)' }}>{lang === 'bn' ? 'ফোন নম্বর:' : 'Phone:'}</span>
                      <span style={{ fontFamily: 'var(--data)', color: 'var(--cream)' }}>{currentUser?.phone || (lang === 'bn' ? 'যুক্ত নেই' : 'Not set')}</span>
                    </div>
                    <div className="profile-info-row">
                      <span style={{ color: 'var(--c70)' }}>{lang === 'bn' ? 'বায়ো:' : 'Bio:'}</span>
                      <span style={{ color: 'var(--cream)' }}>{currentUser?.bio || (lang === 'bn' ? 'তথ্য নেই' : 'None')}</span>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="action-chip action-chip--highlight"
                        onClick={() => setIsEditing(true)}
                      >
                        ✏️ {lang === 'bn' ? 'তথ্য এডিট করুন' : 'Edit Information'}
                      </button>
                      <button
                        type="button"
                        className="action-chip"
                        onClick={() => setAvatarModalOpen(true)}
                      >
                        📷 {lang === 'bn' ? 'ছবি পরিবর্তন' : 'Change Avatar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Change Password Block */}
              <div className="profile-settings-block">
                <h3 className="profile-settings-title">
                  🔑 {lang === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
                </h3>

                {passwordError && (
                  <div className="profile-alert-banner profile-alert-banner--error" style={{ padding: '8px 12px', fontSize: 12.5 }}>
                    <span>⚠️ {passwordError}</span>
                  </div>
                )}

                {passwordMessage && (
                  <div className="profile-alert-banner profile-alert-banner--success" style={{ padding: '8px 12px', fontSize: 12.5 }}>
                    <span>✓ {passwordMessage}</span>
                  </div>
                )}

                {isGuest ? (
                  <div style={{ color: 'var(--c70)', fontSize: 13 }}>
                    <p style={{ margin: '0 0 10px' }}>
                      {lang === 'bn' ? 'গেস্ট অ্যাকাউন্টের কোনো পাসওয়ার্ড থাকে না। অ্যাকাউন্ট স্থায়ী করতে সাইন আপ করুন।' : 'Guest sessions do not have a password. Please sign up to create a permanent account.'}
                    </p>
                    <button
                      type="button"
                      className="action-chip action-chip--highlight"
                      onClick={() => navigate('/register')}
                    >
                      ✨ {lang === 'bn' ? 'রেজিস্টার করুন' : 'Register Now'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {currentUser?.hasPassword !== false && (
                      <div className="profile-form-group">
                        <label className="profile-form-label">{lang === 'bn' ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}</label>
                        <div className="password-input-wrap">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            className="profile-form-input"
                            placeholder="••••••••"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            required
                          />
                          <button
                            type="button"
                            className="password-toggle-btn"
                            onClick={() => setShowCurrentPassword((prev) => !prev)}
                            tabIndex={-1}
                          >
                            {showCurrentPassword ? '👁️' : '🙈'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="profile-form-group">
                      <label className="profile-form-label">{lang === 'bn' ? 'নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'New Password (min 6 chars)'}</label>
                      <div className="password-input-wrap">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          className="profile-form-input"
                          placeholder="••••••••"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          minLength={6}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                          tabIndex={-1}
                        >
                          {showNewPassword ? '👁️' : '🙈'}
                        </button>
                      </div>
                    </div>

                    <div className="profile-form-group">
                      <label className="profile-form-label">{lang === 'bn' ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}</label>
                      <div className="password-input-wrap">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className="profile-form-input"
                          placeholder="••••••••"
                          value={passwordForm.confirmNewPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })}
                          minLength={6}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          tabIndex={-1}
                        >
                          {showConfirmPassword ? '👁️' : '🙈'}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="action-chip action-chip--highlight"
                      disabled={isChangingPassword}
                      style={{ alignSelf: 'flex-start', marginTop: 4, fontWeight: 700 }}
                    >
                      {isChangingPassword ? (lang === 'bn' ? 'আপডেট হচ্ছে...' : 'Updating...') : (lang === 'bn' ? '🔒 পাসওয়ার্ড আপডেট করুন' : '🔒 Update Password')}
                    </button>
                  </form>
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

              {/* Danger Zone: Account Deletion */}
              <div className="profile-settings-block">
                <h3 className="profile-settings-title" style={{ color: 'var(--stamp)' }}>
                  ⚠️ {lang === 'bn' ? 'অ্যাকাউন্ট অপশন ও ডিলিট' : 'Account Actions & Danger Zone'}
                </h3>

                <div className="danger-zone-card">
                  <div>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--cream)' }}>
                      {lang === 'bn' ? 'অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলুন' : 'Permanently Delete Account'}
                    </h4>
                    <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--c70)' }}>
                      {lang === 'bn'
                        ? 'এটি আপনার ট্রিপ হিস্ট্রি, সেভ করা রুট ও সব ডেটা ডাটাবেজ থেকে চিরতরে মুছে ফেলবে।'
                        : 'This permanently wipes your trips, saved routes, and database record.'}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn-danger"
                    onClick={() => setDeleteModalOpen(true)}
                  >
                    🗑️ {lang === 'bn' ? 'অ্যাকাউন্ট ডিলিট' : 'Delete Account'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 6. AVATAR PICKER MODAL */}
        {avatarModalOpen && (
          <div className="profile-modal-overlay" onClick={() => setAvatarModalOpen(false)}>
            <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
              <div className="profile-modal-header">
                <h3 className="profile-modal-title">
                  📷 {lang === 'bn' ? 'প্রোফাইল ছবি নির্বাচন করুন' : 'Select Profile Avatar'}
                </h3>
                <button
                  type="button"
                  className="profile-modal-close-btn"
                  onClick={() => setAvatarModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div>
                <label className="profile-form-label" style={{ marginBottom: 8, display: 'block' }}>
                  {lang === 'bn' ? '১. ট্রানজিট প্রিসেট আইকন বেছে নিন:' : '1. Choose a Dhaka Transit Preset Avatar:'}
                </label>
                <div className="avatar-presets-grid">
                  {TRANSIT_AVATAR_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      className={`avatar-preset-card ${userAvatarUrl === preset.id ? 'avatar-preset-card--selected' : ''}`}
                      onClick={() => handleAvatarPresetSelect(preset.id)}
                    >
                      <span className="avatar-preset-icon">{preset.icon}</span>
                      <span className="avatar-preset-label">{lang === 'bn' ? preset.bn : preset.en}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                <label className="profile-form-label" style={{ marginBottom: 8, display: 'block' }}>
                  {lang === 'bn' ? '২. নিজের ডিভাইস থেকে ছবি আপলোড করুন:' : '2. Or Upload Photo from Device:'}
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="action-chip action-chip--highlight"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ width: '100%', justifyContent: 'center', padding: '10px 14px', fontWeight: 700 }}
                >
                  📁 {lang === 'bn' ? 'ফাইল বেছে নিন (Max 2MB)' : 'Browse Photo (Max 2MB)'}
                </button>
              </div>

              <form onSubmit={handleCustomAvatarSubmit} style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
                <label className="profile-form-label" style={{ marginBottom: 6, display: 'block' }}>
                  {lang === 'bn' ? '৩. অথবা ছবির অনলাইন URL দিন:' : '3. Or Enter Image URL:'}
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="url"
                    className="profile-form-input"
                    placeholder="https://example.com/avatar.jpg"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="submit"
                    className="action-chip"
                    style={{ fontWeight: 700 }}
                  >
                    {lang === 'bn' ? 'সেভ' : 'Set'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 7. DELETE ACCOUNT CONFIRMATION MODAL */}
        {deleteModalOpen && (
          <div className="profile-modal-overlay" onClick={() => setDeleteModalOpen(false)}>
            <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
              <div className="profile-modal-header">
                <h3 className="profile-modal-title" style={{ color: 'var(--stamp)' }}>
                  ⚠️ {lang === 'bn' ? 'অ্যাকাউন্ট ডিলিট নিশ্চিতকরণ' : 'Confirm Account Deletion'}
                </h3>
                <button
                  type="button"
                  className="profile-modal-close-btn"
                  onClick={() => setDeleteModalOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div style={{ fontSize: 13.5, color: 'var(--cream)', lineHeight: 1.5 }}>
                <p>
                  {lang === 'bn'
                    ? 'আপনি কি নিশ্চিত যে আপনার অ্যাকাউন্টটি স্থায়ীভাবে মুছে ফেলতে চান? এটি ডাটাবেজ থেকে আপনার সমস্ত ভ্রমণ হিস্ট্রি, সেভ করা রুট এবং ব্যক্তিগত তথ্য চিরতরে মুছে ফেলবে।'
                    : 'Are you sure you want to delete your account? All your trips, saved routes, and user records will be permanently removed from the database.'}
                </p>
              </div>

              <form onSubmit={handleDeleteAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {currentUser?.hasPassword !== false && !isGuest && (
                  <div className="profile-form-group">
                    <label className="profile-form-label">{lang === 'bn' ? 'নিশ্চিত করতে পাসওয়ার্ড দিন' : 'Enter password to confirm'}</label>
                    <input
                      type="password"
                      className="profile-form-input"
                      placeholder="••••••••"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    type="button"
                    className="action-chip"
                    onClick={() => setDeleteModalOpen(false)}
                    disabled={isDeletingAccount}
                  >
                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="btn-danger"
                    disabled={isDeletingAccount}
                  >
                    {isDeletingAccount
                      ? (lang === 'bn' ? 'ডিলিট হচ্ছে...' : 'Deleting...')
                      : (lang === 'bn' ? 'স্থায়ীভাবে ডিলিট করুন' : 'Permanently Delete')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
