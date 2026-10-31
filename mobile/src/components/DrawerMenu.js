import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  PanResponder,
  Image,
  ScrollView,
  Easing,
  BackHandler,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { SERVER_URL } from '../api/axios';
import { useStyles, DRAWER_WIDTH } from '../styles/DrawerMenu.styles';
import { useColorScheme, useToggleTheme } from '../context/ThemeContext';

// ── Row that flies out from the side ─────────────────────────────────────────
// Same feel as the + (radial) menu: each block springs out from the left edge,
// growing from half size, one after another; on close they fly back in reverse.
const FLY_FROM = -60;   // px left of its place where a block starts

function RollRow({ progress, children }) {
  return (
    <Animated.View
      style={{
        opacity: progress.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
        transformOrigin: 'left center',
        transform: [
          { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [FLY_FROM, 0] }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

// ── Drawer controller ────────────────────────────────────────────────────────
// The drawer lives UNDER the home screen. Opening it rolls the home screen
// (calendar + list) away to the right, like a treadmill going round its drum,
// and the drawer comes up from underneath. `progress` (0 closed → 1 open) drives
// both layers, and it follows your finger while you drag.
const clamp01 = v => Math.max(0, Math.min(1, v));

export function useDrawerController() {
  const progress = useRef(new Animated.Value(0)).current;
  const [isOpen, setIsOpen] = useState(false);
  const [active, setActive] = useState(false);     // drawer layer visible (open or moving)
  const activeRef = useRef(false);

  const activate = (on) => {
    if (activeRef.current !== on) { activeRef.current = on; setActive(on); }
  };

  const animate = (to) => {
    if (to === 1) {
      activate(true);
      Animated.spring(progress, { toValue: 1, useNativeDriver: true, tension: 70, friction: 16 }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 260, easing: Easing.inOut(Easing.cubic), useNativeDriver: true })
        .start(({ finished }) => { if (finished) activate(false); });
    }
  };

  const open  = () => { setIsOpen(true);  animate(1); };
  const close = () => { setIsOpen(false); animate(0); };

  // Swipe right from the left edge → pull the drawer out from under the screen
  const edgePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      activate(true);
      progress.setValue(clamp01(g.dx / DRAWER_WIDTH));
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx > DRAWER_WIDTH * 0.3 || g.vx > 0.5) open(); else close();
    },
    onPanResponderTerminate: () => close(),
  })).current;

  // On the faded home screen: tap → close, drag left → roll the drawer away
  const closePan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6,
    onPanResponderMove: (_, g) => {
      if (g.dx < 0) progress.setValue(clamp01(1 + g.dx / DRAWER_WIDTH));
    },
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) return close();          // tap
      if (g.dx < -DRAWER_WIDTH * 0.3 || g.vx < -0.5) close(); else open();
    },
    onPanResponderTerminate: () => open(),
  })).current;

  // On the drawer panel itself: only a clear left swipe (rows stay tappable)
  const panelPan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderMove: (_, g) => progress.setValue(clamp01(1 + g.dx / DRAWER_WIDTH)),
    onPanResponderRelease: (_, g) => {
      if (g.dx < -DRAWER_WIDTH * 0.3 || g.vx < -0.5) close(); else open();
    },
    onPanResponderTerminate: () => open(),
  })).current;

  // Android back button closes the drawer first
  useEffect(() => {
    if (!isOpen) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => sub.remove();
  }, [isOpen]);

  return { progress, isOpen, active, open, close, edgePan, closePan, panelPan };
}

/**
 * Style for the home screen layer: it stays where it is and simply fades back
 * while the drawer rolls in over it — still visible, just quieter.
 */
export function homeRollStyle(progress) {
  return {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, HOME_FADE], extrapolate: 'clamp' }),
  };
}
const HOME_FADE = 0.35;   // how visible the home screen stays behind the open drawer

export default function DrawerMenu({ controller, navigation, pendingCount = 0, notifCount = 0 }) {
  const { progress: open, isOpen: visible, active, close: onClose, panelPan } = controller;
  const styles      = useStyles();
  const colorScheme = useColorScheme();
  const toggleTheme = useToggleTheme();
  const isDark      = colorScheme === 'dark';
  const insets      = useSafeAreaInsets();
  const { t }       = useTranslation();
  const { user, logout } = useAuth();
  const { members, family } = useFamily();
  const personal = !!family?.is_personal;

  const me = members.find(m => Number(m.id) === Number(user?.id));
  const memberColor = me?.color || '#1a8fa8';
  const initials = [me?.first_name?.[0], me?.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase() || '?';
  const displayName = me
    ? `${me.first_name || ''} ${me.last_name || ''}`.trim()
    : '';
  const avatarPhoto = me?.avatar_url
    ? (me.avatar_url.startsWith('http') ? me.avatar_url : `${SERVER_URL}${me.avatar_url}`)
    : null;
  const [photoFailed, setPhotoFailed] = React.useState(false);
  // A new photo URL (new upload, or a fresh signed link) gets a new chance to load;
  // otherwise one early failure would show initials forever.
  React.useEffect(() => { setPhotoFailed(false); }, [avatarPhoto]);

  const iconColor = isDark ? '#aeaeb2' : '#1d1d1f';

  const go = (screen, params) => {
    onClose();
    setTimeout(() => navigation.navigate(screen, params), 250);
  };

  const handleLogout = () => {
    onClose();
    setTimeout(() => logout(), 250);
  };

  // ── Content: sections of rows ─────────────────────────────────────────────
  const sections = [
    {
      key: 'me',
      rows: [
        { key: 'profile', icon: 'person-outline', label: 'Profile', onPress: () => go('MemberProfile', { memberId: user?.id }) },
      ],
    },
    {
      key: 'calendar',
      title: 'Calendar',
      rows: [
        { key: 'pending', icon: 'notifications-outline', label: 'Pending', badge: pendingCount, onPress: () => go('Pending') },
        { key: 'notifs', icon: 'albums-outline', label: 'Notifications', badge: notifCount, onPress: () => go('Notifications') },
      ],
    },
    {
      key: 'family',
      title: 'Family & Groups',
      rows: [
        { key: 'family', icon: personal ? 'add-circle-outline' : 'home-outline', label: personal ? t('family.create') : 'Family', onPress: () => go('Family') },
        { key: 'groups', icon: 'people-outline', label: 'Groups', onPress: () => go('Groups') },
        ...(personal ? [] : [{ key: 'chat', icon: 'chatbubble-outline', label: 'Family Chat', onPress: () => go('Chat') }]),
        { key: 'join', icon: 'enter-outline', label: t('join.title'), onPress: () => go('JoinFamily') },
      ],
    },
  ];

  // Number of animated blocks: user card + each section + app section
  const blockCount = 1 + sections.length + 1;
  const rolls = useRef(Array.from({ length: 8 }, () => new Animated.Value(0))).current;

  // ── Blocks fly out like the + menu: springs, 70 ms apart; back in reverse ──
  // Starts as soon as the drawer layer appears (tap or edge swipe).
  useEffect(() => {
    if (!active) { rolls.forEach(r => r.setValue(0)); return; }   // hidden → ready for next open
    Animated.stagger(70, rolls.slice(0, blockCount).map(r =>
      Animated.spring(r, { toValue: 1, friction: 8, tension: 110, useNativeDriver: true })
    )).start();
  }, [active]);
  useEffect(() => {
    if (visible || !active) return;   // closing: fly back in, last block first
    Animated.stagger(50, rolls.slice(0, blockCount).reverse().map(r =>
      Animated.timing(r, { toValue: 0, duration: 170, easing: Easing.in(Easing.cubic), useNativeDriver: true })
    )).start();
  }, [visible]);

  // ── The drawer rolls in OVER the home screen ─────────────────────────────
  // Hinged on its left edge, it turns toward you (rotateY) while it slides in
  // from off-screen — the treadmill roll, sideways. Follows the finger on drag.
  // Panel: slides in from the left and grows slightly (no 3D turn), so it looks
  // the same on iOS and Android. The rows inside fly out on top of it.
  const panelStyle = {
    opacity: open.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
    transform: [
      { translateX: open.interpolate({ inputRange: [0, 1], outputRange: [-DRAWER_WIDTH * 0.35, 0] }) },
      { scale: open.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
    ],
  };

  const renderRow = (row, last) => (
    <TouchableOpacity
      key={row.key}
      style={[styles.navItem, !last && styles.navItemDivider]}
      onPress={row.onPress}
      activeOpacity={0.6}
    >
      <View style={styles.navIconWrap}>
        <Ionicons name={row.icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.navLabel}>{row.label}</Text>
      {row.badge > 0 ? (
        <View style={styles.navBadgePill}>
          <Text style={styles.navBadgePillText}>{row.badge > 9 ? '9+' : row.badge}</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={isDark ? '#636366' : '#c7c7cc'} />
      )}
    </TouchableOpacity>
  );

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={active ? 'box-none' : 'none'}
    >
        <Animated.View
          style={[
            styles.drawer,
            { top: insets.top + 4, bottom: insets.bottom + 8 },
            panelStyle,
          ]}
          {...panelPan.panHandlers}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces
          >
            {/* User card */}
            <RollRow progress={rolls[0]}>
              <TouchableOpacity
                style={styles.userSection}
                onPress={() => go('MemberProfile', { memberId: user?.id })}
                activeOpacity={0.7}
              >
                {avatarPhoto && !photoFailed ? (
                  <Image source={{ uri: avatarPhoto }} style={styles.avatar} onError={() => setPhotoFailed(true)} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: memberColor }]}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
                </View>
              </TouchableOpacity>
            </RollRow>

            {/* Sections (Profile row lives in the user card, so skip the "me" section) */}
            {sections.filter(s => s.key !== 'me').map((section, i) => (
              <RollRow key={section.key} progress={rolls[i + 1]}>
                {!!section.title && <Text style={styles.sectionTitle}>{section.title}</Text>}
                <View style={styles.sectionCard}>
                  {section.rows.map((row, j) => renderRow(row, j === section.rows.length - 1))}
                </View>
              </RollRow>
            ))}

            {/* App section */}
            <RollRow progress={rolls[sections.length]}>
              <Text style={styles.sectionTitle}>App</Text>
              <View style={styles.sectionCard}>
                <TouchableOpacity style={[styles.navItem, styles.navItemDivider]} onPress={toggleTheme} activeOpacity={0.7}>
                  <View style={styles.navIconWrap}>
                    <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={20} color={isDark ? '#1a8fa8' : '#f48c06'} />
                  </View>
                  <Text style={styles.navLabel}>{isDark ? 'Dark Mode' : 'Light Mode'}</Text>
                  <View style={[styles.toggleTrack, { backgroundColor: isDark ? '#1a8fa8' : '#e5e5ea', alignItems: isDark ? 'flex-end' : 'flex-start' }]}>
                    <View style={styles.toggleThumb} />
                  </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={handleLogout} activeOpacity={0.6}>
                  <View style={styles.navIconWrap}>
                    <Ionicons name="log-out-outline" size={20} color="#ff3b30" />
                  </View>
                  <Text style={styles.signOutText}>Sign out</Text>
                </TouchableOpacity>
              </View>
            </RollRow>
          </ScrollView>
        </Animated.View>
    </View>
  );
}
