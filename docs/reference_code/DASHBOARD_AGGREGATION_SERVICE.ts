/**
 * 📊 DASHBOARD API AGGREGATION SERVICE
 * 
 * Senior Engineer Approach: Centralized service that efficiently aggregates
 * multiple backend endpoints to provide comprehensive dashboard data in
 * optimized API calls, reducing frontend complexity and improving performance.
 * 
 * Features:
 * - Single API calls for complex dashboard data
 * - Efficient parallel data fetching
 * - Caching with TTL for performance
 * - Error handling with graceful fallbacks
 * - Role-based data aggregation
 * - Real-time data refresh capabilities
 * 
 * @version 2.0.0
 * @created 2025-08-27
 */

import axios, { AxiosInstance } from 'axios';

// Note: In frontend, replace this import with:
// import { apiService } from './api';
// For now, this service is self-contained

// ===========================
// TYPES & INTERFACES
// ===========================

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalBounties: number;
  activeBounties: number;
  totalRewards: number;
  activeRewards: number;
  totalPointRequests: number;
  pendingPointRequests: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  timestamp: Date;
}

export interface UserDashboardData {
  profile: UserProfile;
  stats: UserStats;
  recentActivity: RecentActivity[];
  achievements: Achievement[];
  notifications: Notification[];
  quickActions: QuickAction[];
}

export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email?: string;
  role: string;
  college_id?: number;
  college_name?: string;
  avatar_url?: string;
  total_points: number;
  total_berries: number;
  net_berries: number;
}

export interface UserStats {
  bounties_completed: number;
  bounties_in_progress: number;
  rewards_claimed: number;
  points_earned_this_month: number;
  berries_earned_this_month: number;
  rank_position?: number;
  completion_rate: number;
}

export interface RecentActivity {
  id: string;
  type: 'bounty_completed' | 'reward_claimed' | 'point_request_approved' | 'achievement_earned';
  title: string;
  description: string;
  points?: number;
  berries?: number;
  timestamp: Date;
  status: 'success' | 'pending' | 'failed';
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earned_date?: Date;
  progress?: number;
  max_progress?: number;
  category: 'points' | 'bounties' | 'social' | 'learning';
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: Date;
  action_url?: string;
}

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  permission_required?: string;
  role_required?: string[];
}

export interface AdminDashboardData {
  systemStats: DashboardStats;
  userMetrics: UserMetrics;
  contentMetrics: ContentMetrics;
  recentActivity: AdminActivity[];
  alerts: SystemAlert[];
  performance: PerformanceMetrics;
}

export interface UserMetrics {
  total_users: number;
  active_users: number;
  new_users_this_month: number;
  users_by_role: Record<string, number>;
  users_by_college: Record<string, number>;
}

export interface ContentMetrics {
  total_bounties: number;
  active_bounties: number;
  completed_bounties: number;
  total_rewards: number;
  claimed_rewards: number;
  point_requests_pending: number;
  point_requests_approved: number;
}

export interface AdminActivity {
  id: string;
  type: 'user_created' | 'bounty_created' | 'reward_claimed' | 'point_request_reviewed';
  description: string;
  user_name: string;
  timestamp: Date;
  details: Record<string, any>;
}

export interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  action_required: boolean;
}

export interface PerformanceMetrics {
  api_response_time: number;
  database_connections: number;
  active_sessions: number;
  memory_usage: number;
  cpu_usage: number;
  uptime: number;
}

// ===========================
// CACHE MANAGEMENT
// ===========================

interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  ttl: number; // Time to live in milliseconds
}

class DashboardCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = new Date().getTime();
    const entryTime = entry.timestamp.getTime();
    
    if (now - entryTime > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  clear(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  size(): number {
    return this.cache.size;
  }
}

// ===========================
// MAIN DASHBOARD SERVICE
// ===========================

class DashboardAggregationService {
  private cache = new DashboardCache();
  private apiClient: AxiosInstance;
  private readonly CACHE_TTL = {
    DASHBOARD_STATS: 2 * 60 * 1000, // 2 minutes
    USER_DATA: 5 * 60 * 1000, // 5 minutes
    ADMIN_DATA: 1 * 60 * 1000, // 1 minute
    QUICK_ACTIONS: 30 * 60 * 1000, // 30 minutes
  };

  constructor() {
    this.apiClient = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to all requests
    this.apiClient.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  /**
   * Get comprehensive user dashboard data
   * Aggregates multiple endpoints into a single optimized call
   */
  async getUserDashboard(userId: string, useCache: boolean = true): Promise<UserDashboardData> {
    const cacheKey = `user_dashboard_${userId}`;
    
    if (useCache) {
      const cached = this.cache.get<UserDashboardData>(cacheKey);
      if (cached) return cached;
    }

    try {
      // Parallel fetch of all required data
      const [
        userMetrics,
        userEarnings,
        netBerries,
        myParticipations,
        leaderboard,
        systemHealth
      ] = await Promise.all([
        apiService.dashboard.getUserMetrics(userId),
        apiService.analytics.getUserEarnings(userId),
        apiService.analytics.getNetBerries(userId),
        apiService.client.get('/bounty-participation/my'),
        apiService.dashboard.getTopPerformers(),
        apiService.dashboard.getSystemHealth()
      ]);

      // Calculate user stats
      const participations = myParticipations.data || [];
      const completedBounties = participations.filter((p: any) => p.status === 'completed').length;
      const inProgressBounties = participations.filter((p: any) => p.status === 'in_progress').length;

      // Build comprehensive dashboard data
      const dashboardData: UserDashboardData = {
        profile: {
          id: userId,
          name: userMetrics.data?.user?.name || '',
          username: userMetrics.data?.user?.username || '',
          email: userMetrics.data?.user?.email,
          role: userMetrics.data?.user?.role || 'student',
          college_id: userMetrics.data?.user?.college_id,
          college_name: userMetrics.data?.user?.college_name,
          total_points: userEarnings.data?.total_points || 0,
          total_berries: userEarnings.data?.total_berries || 0,
          net_berries: netBerries.data?.net_berries || 0
        },
        stats: {
          bounties_completed: completedBounties,
          bounties_in_progress: inProgressBounties,
          rewards_claimed: 0, // TODO: Implement when endpoint available
          points_earned_this_month: this.calculateMonthlyEarnings(participations, 'points'),
          berries_earned_this_month: this.calculateMonthlyEarnings(participations, 'berries'),
          rank_position: this.findUserRank(leaderboard.data, userId),
          completion_rate: this.calculateCompletionRate(participations)
        },
        recentActivity: this.buildRecentActivity(participations),
        achievements: this.buildAchievements(userEarnings.data, completedBounties),
        notifications: this.buildNotifications(userId),
        quickActions: this.buildQuickActions(userMetrics.data?.user?.role)
      };

      // Cache the result
      this.cache.set(cacheKey, dashboardData, this.CACHE_TTL.USER_DATA);
      
      return dashboardData;
    } catch (error) {
      console.error('Error fetching user dashboard:', error);
      throw new Error('Failed to load dashboard data');
    }
  }

  /**
   * Get comprehensive admin dashboard data
   * Optimized aggregation for administrative overview
   */
  async getAdminDashboard(useCache: boolean = true): Promise<AdminDashboardData> {
    const cacheKey = 'admin_dashboard';
    
    if (useCache) {
      const cached = this.cache.get<AdminDashboardData>(cacheKey);
      if (cached) return cached;
    }

    try {
      // Parallel fetch of admin-specific data
      const [
        systemStats,
        systemMetrics,
        leaderboard,
        systemHealth
      ] = await Promise.all([
        apiService.analytics.getSystemMetrics(),
        apiService.dashboard.getSystemAlerts(),
        apiService.dashboard.getTopPerformers(),
        apiService.dashboard.getSystemHealth()
      ]);

      const adminData: AdminDashboardData = {
        systemStats: this.buildSystemStats(systemHealth.data),
        userMetrics: this.buildUserMetrics(systemStats.data),
        contentMetrics: this.buildContentMetrics(systemStats.data),
        recentActivity: this.buildAdminActivity(),
        alerts: this.buildSystemAlerts(systemMetrics.data),
        performance: this.buildPerformanceMetrics(systemHealth.data)
      };

      // Cache the result
      this.cache.set(cacheKey, adminData, this.CACHE_TTL.ADMIN_DATA);
      
      return adminData;
    } catch (error) {
      console.error('Error fetching admin dashboard:', error);
      throw new Error('Failed to load admin dashboard data');
    }
  }

  /**
   * Get real-time system statistics
   * Minimal caching for up-to-date data
   */
  async getSystemStats(useCache: boolean = false): Promise<DashboardStats> {
    const cacheKey = 'system_stats';
    
    if (useCache) {
      const cached = this.cache.get<DashboardStats>(cacheKey);
      if (cached) return cached;
    }

    try {
      const [systemHealth, systemMetrics] = await Promise.all([
        apiService.dashboard.getSystemHealth(),
        apiService.analytics.getSystemMetrics()
      ]);

      const stats = this.buildSystemStats(systemHealth.data);
      
      // Short cache for real-time data
      this.cache.set(cacheKey, stats, this.CACHE_TTL.DASHBOARD_STATS);
      
      return stats;
    } catch (error) {
      console.error('Error fetching system stats:', error);
      throw new Error('Failed to load system statistics');
    }
  }

  /**
   * Refresh dashboard data
   * Force refresh by clearing cache
   */
  async refreshDashboard(userId?: string): Promise<void> {
    if (userId) {
      this.cache.clear(`user_dashboard_${userId}`);
    } else {
      this.cache.clear('dashboard');
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size(),
      keys: Array.from((this.cache as any).cache.keys())
    };
  }

  // ===========================
  // PRIVATE HELPER METHODS
  // ===========================

  private calculateMonthlyEarnings(participations: any[], type: 'points' | 'berries'): number {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return participations
      .filter(p => {
        const createdDate = new Date(p.created_on);
        return createdDate.getMonth() === currentMonth && 
               createdDate.getFullYear() === currentYear;
      })
      .reduce((total, p) => {
        return total + (type === 'points' ? (p.points_earned || 0) : (p.berries_earned || 0));
      }, 0);
  }

  private findUserRank(leaderboard: any, userId: string): number | undefined {
    if (!leaderboard || !Array.isArray(leaderboard)) return undefined;
    
    const userIndex = leaderboard.findIndex(user => user.id === userId);
    return userIndex >= 0 ? userIndex + 1 : undefined;
  }

  private calculateCompletionRate(participations: any[]): number {
    if (participations.length === 0) return 0;
    
    const completed = participations.filter(p => p.status === 'completed').length;
    return Math.round((completed / participations.length) * 100);
  }

  private buildRecentActivity(participations: any[]): RecentActivity[] {
    return participations
      .slice(0, 10)
      .map(p => ({
        id: p.id,
        type: 'bounty_completed' as const,
        title: p.bounty_name || 'Bounty Participation',
        description: `Earned ${p.points_earned} points and ${p.berries_earned} berries`,
        points: p.points_earned,
        berries: p.berries_earned,
        timestamp: new Date(p.created_on),
        status: p.status === 'completed' ? 'success' as const : 'pending' as const
      }));
  }

  private buildAchievements(earningsData: any, completedBounties: number): Achievement[] {
    const achievements: Achievement[] = [];
    
    // Dynamic achievement generation based on data
    if (completedBounties >= 1) {
      achievements.push({
        id: 'first_bounty',
        title: 'First Bounty',
        description: 'Completed your first bounty',
        icon: '🎯',
        earned_date: new Date(),
        category: 'bounties'
      });
    }

    if (completedBounties >= 5) {
      achievements.push({
        id: 'bounty_hunter',
        title: 'Bounty Hunter',
        description: 'Completed 5 bounties',
        icon: '🏹',
        earned_date: new Date(),
        category: 'bounties'
      });
    }

    return achievements;
  }

  private buildNotifications(userId: string): Notification[] {
    // Mock notifications - replace with actual notification system
    return [
      {
        id: '1',
        title: 'New Bounty Available',
        message: 'A new coding challenge bounty has been posted',
        type: 'info',
        read: false,
        timestamp: new Date(),
        action_url: '/bounties'
      }
    ];
  }

  private buildQuickActions(role: string): QuickAction[] {
    const baseActions: QuickAction[] = [
      {
        id: 'view_bounties',
        title: 'Browse Bounties',
        description: 'Explore available challenges',
        icon: '🎯',
        url: '/bounties'
      },
      {
        id: 'view_rewards',
        title: 'View Rewards',
        description: 'Check available rewards',
        icon: '🏆',
        url: '/rewards'
      }
    ];

    if (role === 'admin' || role === 'creator') {
      baseActions.push(
        {
          id: 'create_bounty',
          title: 'Create Bounty',
          description: 'Add new bounty',
          icon: '➕',
          url: '/bounties/create',
          permission_required: 'createBounty'
        },
        {
          id: 'manage_users',
          title: 'Manage Users',
          description: 'User administration',
          icon: '👥',
          url: '/admin/users',
          permission_required: 'viewAllUsers'
        }
      );
    }

    if (role === 'faculty') {
      baseActions.push({
        id: 'review_requests',
        title: 'Review Requests',
        description: 'Review point requests',
        icon: '📋',
        url: '/point-requests/review',
        permission_required: 'reviewPointRequests'
      });
    }

    if (role === 'student') {
      baseActions.push({
        id: 'submit_request',
        title: 'Submit Request',
        description: 'Request points for activity',
        icon: '📝',
        url: '/point-requests/create',
        permission_required: 'submitPointRequest'
      });
    }

    return baseActions;
  }

  private buildSystemStats(healthData: any): DashboardStats {
    return {
      totalUsers: healthData?.user_count || 0,
      activeUsers: healthData?.active_users || 0,
      totalBounties: healthData?.bounty_count || 0,
      activeBounties: healthData?.active_bounties || 0,
      totalRewards: healthData?.reward_count || 0,
      activeRewards: healthData?.active_rewards || 0,
      totalPointRequests: healthData?.point_request_count || 0,
      pendingPointRequests: healthData?.pending_requests || 0,
      systemHealth: this.determineSystemHealth(healthData),
      timestamp: new Date()
    };
  }

  private buildUserMetrics(data: any): UserMetrics {
    return {
      total_users: data?.total_users || 0,
      active_users: data?.active_users || 0,
      new_users_this_month: data?.new_users_this_month || 0,
      users_by_role: data?.users_by_role || {},
      users_by_college: data?.users_by_college || {}
    };
  }

  private buildContentMetrics(data: any): ContentMetrics {
    return {
      total_bounties: data?.total_bounties || 0,
      active_bounties: data?.active_bounties || 0,
      completed_bounties: data?.completed_bounties || 0,
      total_rewards: data?.total_rewards || 0,
      claimed_rewards: data?.claimed_rewards || 0,
      point_requests_pending: data?.point_requests_pending || 0,
      point_requests_approved: data?.point_requests_approved || 0
    };
  }

  private buildAdminActivity(): AdminActivity[] {
    // Mock data - replace with actual activity tracking
    return [];
  }

  private buildSystemAlerts(data: any): SystemAlert[] {
    const alerts: SystemAlert[] = [];
    
    // Generate alerts based on system data
    if (data?.database_connections > 80) {
      alerts.push({
        id: 'db_connections',
        type: 'warning',
        title: 'High Database Connections',
        message: 'Database connections are above 80%',
        timestamp: new Date(),
        resolved: false,
        action_required: true
      });
    }

    return alerts;
  }

  private buildPerformanceMetrics(data: any): PerformanceMetrics {
    return {
      api_response_time: data?.response_time || 0,
      database_connections: data?.db_connections || 0,
      active_sessions: data?.active_sessions || 0,
      memory_usage: data?.memory_usage || 0,
      cpu_usage: data?.cpu_usage || 0,
      uptime: data?.uptime || 0
    };
  }

  private determineSystemHealth(data: any): 'healthy' | 'warning' | 'critical' {
    if (!data) return 'critical';
    
    const cpuUsage = data.cpu_usage || 0;
    const memoryUsage = data.memory_usage || 0;
    const dbConnections = data.db_connections || 0;

    if (cpuUsage > 90 || memoryUsage > 90 || dbConnections > 90) {
      return 'critical';
    } else if (cpuUsage > 70 || memoryUsage > 70 || dbConnections > 70) {
      return 'warning';
    }

    return 'healthy';
  }
}

// ===========================
// EXPORT SINGLETON INSTANCE
// ===========================

export const dashboardService = new DashboardAggregationService();

export default dashboardService;