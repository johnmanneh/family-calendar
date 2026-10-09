import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  PanResponder,
  Image,
  ScrollView,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { SERVER_URL } from '../api/axios';
import { useStyles, DRAWER_WIDTH } from '../styles/DrawerMenu.styles';
import { useColorScheme, useToggleTheme } from '../context/ThemeContext';
import { TILT_DIR } from './TreadmillList';

// ── Rolling row ─────────────────────────────────────────────────────────────
// Same idea as the treadmill list, but gentle and only on open: each row rolls
// up off the "drum" (small rotateX + rise + fade), one after another.
const ROLL_TILT = 28;   // degrees — the list uses 60, this is the soft version
const ROLL_RISE = 14;   // px the row travels up while it settles

function RollRow({ progress, children }) {
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [
          { perspective: 700 },
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [ROLL_RISE, 0] }) },
          { rotateX: progress.interpolate({ inputRange: [0, 1], outputRange: [`${ROLL_TILT * TILT_DIR}deg`, '0deg'] }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function DrawerMenu({ visible, onClose, navigation, pendingCount = 0, notifCount = 0 }) {
  const styles      = useStyles();
  const colorScheme = useColorScheme();
  const toggleTheme = useToggleTheme();
  const isDark      = colorScheme === 'dark';
  const insets      = useSafeAreaInsets();
  const { t }       = useTranslation();
  const { user, logout } = useAuth();
  const { members } = useFamily();

  const me = members.find(m => Number(m.id) === Number(user?.id));
  const memberColor = me?.color || '#1a8fa8';
  const initials = [me?.first_name?.[0], me?.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';
  const displayName = me
    ? `${me.first_name || ''} ${me.last_name || ''}`.trim()
    : user?.email || '';
  const avatarPhoto = me?.avatar_url
    ? (me.avatar_url.startsWith('http') ? me.avatar_url : `${SERVER_URL}${me.avatar_url}`)
    : null;

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
        { key: 'family', icon: 'home-outline', label: 'Family', onPress: () => go('Family') },
        { key: 'groups', icon: 'people-outline', label: 'Groups', onPress: () => go('Groups') },
        { key: 'chat', icon: 'chatbubble-outline', label: 'Family Chat', onPress: () => go('Chat') },
        { key: 'join', icon: 'enter-outline', label: t('join.title'), onPress: () => go('JoinFamily') },
      ],
    },
  ];

  // Number of animated blocks: user card + each section + app section
  const blockCount = 1 + sections.length + 1;
  const rolls = useRef(Array.from({ length: 8 }, () => new Animated.Value(0))).current;

  // ── Panel animation: the whole drawer rolls in like a drum ─────────────────
  // `open` goes 0 → 1. The panel is hinged on its left edge and turns toward
  // you (rotateY) while it slides in — the treadmill roll, but sideways.
  // While you drag it closed, `open` follows your finger, so it rolls back.
  const DRUM_TILT = 70;                    // degrees when fully closed
  const open = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);   // keep Modal up during close

  const animateTo = (to, done) => {
    if (to === 1) {
      Animated.spring(open, { toValue: 1, useNativeDriver: true, tension: 120, friction: 16 }).start(done);
    } else {
      Animated.timing(open, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(done);
    }
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
      rolls.forEach(r => r.setValue(0));
      open.setValue(0);
      animateTo(1);
      // Rows roll in one after another, just behind the panel
      Animated.sequence([
        Animated.delay(90),
        Animated.stagger(55, rolls.slice(0, blockCount).map(r =>
          Animated.timing(r, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: true })
        )),
      ]).start();
    } else if (mounted) {
      animateTo(0, () => setMounted(false));
    }
  }, [visible]);

  const panelStyle = {
    opacity: open.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
    transform: [
      { perspective: 900 },
      { translateX: open.interpolate({ inputRange: [0, 1], outputRange: [-DRAWER_WIDTH * 0.45, 0] }) },
      { rotateY: open.interpolate({ inputRange: [0, 1], outputRange: [`${DRUM_TILT * TILT_DIR}deg`, '0deg'] }) },
      { scale: open.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
    ],
  };

  // ── Drag left to roll it closed ──────────────────────────────────────────
  const closePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dx < -8 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderMove: (_, g) => {
        open.setValue(Math.max(0, Math.min(1, 1 + g.dx / DRAWER_WIDTH)));
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -DRAWER_WIDTH * 0.3 || g.vx < -0.5) onClose();
        else animateTo(1);
      },
      onPanResponderTerminate: () => animateTo(1),
    })
  ).current;

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
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>

        {/* Dimmed background — tap anywhere outside the panel to close */}
        <Animated.View style={[styles.backdrop, { opacity: open.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }) }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        {/* ── Floating panel — same card language as the home top card ── */}
        <Animated.View
          style={[
            styles.drawer,
            { top: insets.top + 4, bottom: insets.bottom + 8 },
            panelStyle,
          ]}
          {...closePan.panHandlers}
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
                {avatarPhoto ? (
                  <Image source={{ uri: avatarPhoto }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: memberColor }]}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
                  <Text style={styles.userEmail} numberOfLines={1}>{user?.email || ''}</Text>
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
    </Modal>
  );
}
