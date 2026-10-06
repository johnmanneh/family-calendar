import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  StyleSheet,
  Dimensions,
  PanResponder,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { SERVER_URL } from '../api/axios';

const DRAWER_WIDTH = Dimensions.get('window').width * 0.75;

export default function DrawerMenu({ visible, onClose, navigation, pendingCount = 0 }) {
  const { user, logout } = useAuth();
  const { members } = useFamily();

  const me = members.find(m => Number(m.id) === Number(user?.id));
  const memberColor = me?.color || '#1a8fa8';
  const initials = [me?.first_name?.[0], me?.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase() || user?.email?.[0]?.toUpperCase() || '?';
  const displayName = me
    ? `${me.first_name || ''} ${me.last_name || ''}`.trim()
    : user?.email || '';
  // Build a full URL if the avatar is stored as a relative path
  const avatarPhoto = me?.avatar_url
    ? (me.avatar_url.startsWith('http') ? me.avatar_url : `${SERVER_URL}${me.avatar_url}`)
    : null;

  // ── Slide animation ───────────────────────────────────────────────────────
  const slideX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideX, {
        toValue: 0,
        useNativeDriver: true,
        tension: 200,
        friction: 20,
      }).start();
    } else {
      Animated.timing(slideX, {
        toValue: -DRAWER_WIDTH,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleLogout = () => {
    onClose();
    setTimeout(() => logout(), 250);
  };

  // ── Swipe left on the drawer to close ────────────────────────────────────
  const closePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) => {
        if (g.dx < -30) onClose();
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/*
        Layout: flex row, full screen, dark background
        ┌──────────────────┬──────────────────┐
        │   Drawer (75%)   │  Tap to close    │
        │                  │     (25%)        │
        └──────────────────┴──────────────────┘
        The dark background shows through on both sides.
        The right column is a TouchableOpacity — tap it to dismiss.
        The drawer slides in via translateX, keeping its layout space reserved.
      */}
      <View style={styles.root}>

        {/* ── Drawer panel ── */}
        <Animated.View style={[styles.drawer, { transform: [{ translateX: slideX }] }]} {...closePan.panHandlers}>

          {/* User section */}
          <View style={styles.userSection}>
            {avatarPhoto ? (
              <Image source={{ uri: avatarPhoto }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: memberColor }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <Text style={styles.userName}>{displayName}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
          </View>

          <View style={styles.divider} />

          {/* Nav items */}
          <View style={styles.nav}>
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onClose();
                setTimeout(() => navigation.navigate('MemberProfile', { memberId: user?.id }), 250);
              }}
            >
              <Ionicons name="person-outline" size={20} color="#1d1d1f" />
              <Text style={styles.navLabel}>Profile</Text>
            </TouchableOpacity>

            {/* Pending tasks — badge shows count when > 0 */}
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onClose();
                setTimeout(() => navigation.navigate('Pending'), 250);
              }}
            >
              <View style={styles.navIconWrap}>
                <Ionicons name="notifications-outline" size={20} color="#1d1d1f" />
                {pendingCount > 0 && (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.navLabel}>Pending</Text>
              {pendingCount > 0 && (
                <View style={styles.navBadgePill}>
                  <Text style={styles.navBadgePillText}>{pendingCount > 9 ? '9+' : pendingCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onClose();
                setTimeout(() => navigation.navigate('Family'), 250);
              }}
            >
              <Ionicons name="home-outline" size={20} color="#1d1d1f" />
              <Text style={styles.navLabel}>Family</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => {
                onClose();
                setTimeout(() => navigation.navigate('Groups'), 250);
              }}
            >
              <Ionicons name="people-outline" size={20} color="#1d1d1f" />
              <Text style={styles.navLabel}>Groups</Text>
            </TouchableOpacity>
          </View>

          {/* Sign out */}
          <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#ff3b30" />
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>

        </Animated.View>

        {/* ── Right side — tap anywhere here to close ── */}
        <TouchableOpacity style={styles.closeArea} onPress={onClose} activeOpacity={1} />

      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({

  // Full-screen dark background, flex row
  root: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },

  // Drawer occupies the left 75%
  drawer: {
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    paddingTop: 60,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 4, height: 0 },
    elevation: 16,
  },

  // Remaining 25% — tap to dismiss
  closeArea: {
    flex: 1,
  },

  // User section
  userSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1d1d1f',
    letterSpacing: -0.3,
  },
  userEmail: {
    fontSize: 13,
    color: '#aeaeb2',
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: '#f2f2f7',
    marginHorizontal: 24,
    marginBottom: 8,
  },

  // Nav
  nav: {
    flex: 1,
    paddingTop: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  navLabel: {
    fontSize: 16,
    color: '#1d1d1f',
    fontWeight: '500',
    flex: 1,
  },
  // Wrapper so the icon + small dot badge sit together
  navIconWrap: {
    position: 'relative',
    width: 20,
    height: 20,
  },
  // Small dot on the icon corner
  navBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#ff3b30',
    borderRadius: 6,
    minWidth: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  navBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  // Pill on the right edge of the row
  navBadgePill: {
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  navBadgePillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Sign out
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: '#f2f2f7',
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 16,
    color: '#ff3b30',
    fontWeight: '500',
  },
});
