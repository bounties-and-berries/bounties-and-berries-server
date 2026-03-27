const fs = require('fs');
const path = require('path');

// Backend API Inventory (from our analysis)
const BACKEND_APIS = {
  authentication: [
    'POST /api/auth/login'
  ],
  user: [
    'POST /api/users',
    'POST /api/users/bulk', 
    'POST /api/users/change-password',
    'PATCH /api/users/profile-image'
  ],
  bounties: [
    'GET /api/bounties',
    'GET /api/bounties/admin/all',
    'POST /api/bounties/search',
    'GET /api/bounties/:id',
    'POST /api/bounties',
    'PUT /api/bounties/:id',
    'DELETE /api/bounties/:id',
    'PATCH /api/bounties/:name',
    'POST /api/bounties/register/:bountyId'
  ],
  rewards: [
    'GET /api/reward',
    'GET /api/reward/:id',
    'POST /api/reward',
    'PUT /api/reward/:id',
    'DELETE /api/reward/:id',
    'POST /api/reward/:id/claim',
    'GET /api/reward/user/claimed',
    'POST /api/reward/search'
  ],
  achievements: [
    'GET /api/achievement/:userId',
    'POST /api/achievement',
    'PUT /api/achievement/:id',
    'DELETE /api/achievement/:id'
  ],
  pointRequests: [
    'GET /api/pointRequest/reviewers',
    'GET /api/pointRequest/my-requests',
    'GET /api/pointRequest/assigned',
    'POST /api/pointRequest/with-evidence',
    'PUT /api/pointRequest/:id/review'
  ],
  colleges: [
    'GET /api/college',
    'GET /api/college/search',
    'GET /api/college/:id',
    'POST /api/college',
    'PUT /api/college/:id',
    'PATCH /api/college/:id',
    'DELETE /api/college/:id',
    'GET /api/college/admin/all'
  ],
  roles: [
    'GET /api/role',
    'GET /api/role/:id',
    'POST /api/role',
    'PUT /api/role/:id',
    'PATCH /api/role/:id',
    'DELETE /api/role/:id'
  ],
  status: [
    'GET /api/status',
    'GET /api/status/detailed',
    'GET /api/status/health'
  ],
  bountyParticipation: [
    'GET /api/bountyParticipation/earnings/:userId',
    'GET /api/bountyParticipation/net-berries/:userId',
    'GET /api/bountyParticipation/bounty/:bountyId',
    'POST /api/bountyParticipation',
    'GET /api/bountyParticipation',
    'PUT /api/bountyParticipation/:id',
    'DELETE /api/bountyParticipation/:id'
  ],
  userRewardClaim: [
    'POST /api/userRewardClaim',
    'GET /api/userRewardClaim',
    'PUT /api/userRewardClaim/:id',
    'DELETE /api/userRewardClaim/:id'
  ],
  images: [
    'POST /api/image/upload/:category'
  ]
};

class IntegrationAnalyzer {
  constructor() {
    this.backendAPIs = this.flattenBackendAPIs();
    this.frontendAPIs = [];
    this.analysis = {
      integrated: [],
      missing: [],
      unknown: [],
      byRole: {
        admin: { integrated: [], missing: [] },
        faculty: { integrated: [], missing: [] },
        student: { integrated: [], missing: [] }
      },
      byPriority: {
        critical: [],
        high: [],
        medium: [],
        low: []
      }
    };
  }

  flattenBackendAPIs() {
    const flattened = [];
    Object.values(BACKEND_APIS).forEach(category => {
      flattened.push(...category);
    });
    return flattened;
  }

  loadFrontendAnalysis(frontendResultsPath) {
    try {
      if (fs.existsSync(frontendResultsPath)) {
        const summaryPath = path.join(frontendResultsPath, 'integration-summary.txt');
        if (fs.existsSync(summaryPath)) {
          const content = fs.readFileSync(summaryPath, 'utf8');
          this.extractFrontendAPIs(content);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading frontend analysis:', error.message);
      return false;
    }
  }

  extractFrontendAPIs(content) {
    const lines = content.split('\n');
    let inEndpointsSection = false;
    
    for (const line of lines) {
      if (line.includes('Unique API Endpoints:')) {
        inEndpointsSection = true;
        continue;
      }
      
      if (inEndpointsSection && line.trim()) {
        // Extract API paths from frontend code
        const matches = line.match(/api\/[^\s'"]+/g);
        if (matches) {
          this.frontendAPIs.push(...matches.map(m => m.replace('api/', '')));
        }
      }
    }
    
    // Remove duplicates
    this.frontendAPIs = [...new Set(this.frontendAPIs)];
  }

  analyzeIntegration() {
    // Find integrated APIs
    this.analysis.integrated = this.backendAPIs.filter(api => {
      const path = api.split(' ')[1].replace('/api/', '');
      return this.frontendAPIs.some(frontendPath => 
        frontendPath.includes(path) || path.includes(frontendPath)
      );
    });

    // Find missing APIs
    this.analysis.missing = this.backendAPIs.filter(api => 
      !this.analysis.integrated.includes(api)
    );

    // Find unknown frontend APIs (not in backend)
    this.analysis.unknown = this.frontendAPIs.filter(frontendPath => {
      return !this.backendAPIs.some(api => {
        const backendPath = api.split(' ')[1].replace('/api/', '');
        return backendPath.includes(frontendPath) || frontendPath.includes(backendPath);
      });
    });

    this.categorizeByRole();
    this.categorizByPriority();
  }

  categorizeByRole() {
    const roleMapping = {
      admin: [
        'users', 'role', 'college', 'admin/all', 'bountyParticipation', 'userRewardClaim'
      ],
      faculty: [
        'bounties', 'reward', 'pointRequest/assigned', 'pointRequest.*review', 'achievement'
      ],
      student: [
        'bounties/register', 'bounties/search', 'reward/.*claim', 'pointRequest/my-requests',
        'pointRequest/with-evidence', 'pointRequest/reviewers', 'profile-image', 'change-password'
      ]
    };

    Object.keys(roleMapping).forEach(role => {
      const patterns = roleMapping[role];
      
      this.analysis.byRole[role].integrated = this.analysis.integrated.filter(api =>
        patterns.some(pattern => new RegExp(pattern).test(api))
      );
      
      this.analysis.byRole[role].missing = this.analysis.missing.filter(api =>
        patterns.some(pattern => new RegExp(pattern).test(api))
      );
    });
  }

  categorizByPriority() {
    const priorityMapping = {
      critical: [
        'auth/login', 'bounties', 'reward', 'status'
      ],
      high: [
        'users', 'pointRequest', 'achievement', 'profile-image', 'register', 'claim'
      ],
      medium: [
        'college', 'role', 'bountyParticipation', 'userRewardClaim', 'image/upload'
      ],
      low: [
        'admin/all', 'detailed', 'health'
      ]
    };

    Object.keys(priorityMapping).forEach(priority => {
      const patterns = priorityMapping[priority];
      
      this.analysis.byPriority[priority] = this.analysis.missing.filter(api =>
        patterns.some(pattern => new RegExp(pattern).test(api))
      );
    });
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalBackendAPIs: this.backendAPIs.length,
        totalFrontendAPIs: this.frontendAPIs.length,
        integratedAPIs: this.analysis.integrated.length,
        missingAPIs: this.analysis.missing.length,
        unknownAPIs: this.analysis.unknown.length,
        integrationPercentage: Math.round((this.analysis.integrated.length / this.backendAPIs.length) * 100)
      },
      details: this.analysis,
      recommendations: this.generateRecommendations()
    };

    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    // Priority-based recommendations
    if (this.analysis.byPriority.critical.length > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'Implement immediately',
        apis: this.analysis.byPriority.critical,
        impact: 'Application may not function without these APIs'
      });
    }

    if (this.analysis.byPriority.high.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Implement in next sprint',
        apis: this.analysis.byPriority.high,
        impact: 'Core user functionality affected'
      });
    }

    // Role-based recommendations
    Object.keys(this.analysis.byRole).forEach(role => {
      const missing = this.analysis.byRole[role].missing;
      if (missing.length > 0) {
        recommendations.push({
          priority: 'ROLE-SPECIFIC',
          action: `Implement ${role} features`,
          apis: missing,
          impact: `${role} users missing key functionality`
        });
      }
    });

    return recommendations;
  }

  saveReport(outputPath = './integration-gap-analysis.json') {
    const report = this.generateReport();
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    
    // Also save a human-readable version
    const readableReport = this.generateReadableReport(report);
    fs.writeFileSync(outputPath.replace('.json', '.md'), readableReport);
    
    return report;
  }

  generateReadableReport(report) {
    return `# Integration Gap Analysis Report

Generated: ${report.timestamp}

## Summary
- **Total Backend APIs**: ${report.summary.totalBackendAPIs}
- **Total Frontend API References**: ${report.summary.totalFrontendAPIs}
- **Integrated APIs**: ${report.summary.integratedAPIs}
- **Missing APIs**: ${report.summary.missingAPIs}
- **Unknown Frontend APIs**: ${report.summary.unknownAPIs}
- **Integration Percentage**: ${report.summary.integrationPercentage}%

## Integrated APIs (${report.details.integrated.length})
${report.details.integrated.map(api => `- ✅ ${api}`).join('\n')}

## Missing APIs (${report.details.missing.length})
${report.details.missing.map(api => `- ❌ ${api}`).join('\n')}

## Unknown Frontend APIs (${report.details.unknown.length})
${report.details.unknown.map(api => `- ❓ ${api}`).join('\n')}

## By Role Analysis

### Admin Role
- **Integrated**: ${report.details.byRole.admin.integrated.length} APIs
- **Missing**: ${report.details.byRole.admin.missing.length} APIs

### Faculty Role  
- **Integrated**: ${report.details.byRole.faculty.integrated.length} APIs
- **Missing**: ${report.details.byRole.faculty.missing.length} APIs

### Student Role
- **Integrated**: ${report.details.byRole.student.integrated.length} APIs
- **Missing**: ${report.details.byRole.student.missing.length} APIs

## Priority Recommendations

${report.recommendations.map(rec => `
### ${rec.priority} Priority
**Action**: ${rec.action}
**Impact**: ${rec.impact}
**APIs**:
${rec.apis.map(api => `- ${api}`).join('\n')}
`).join('\n')}

## Next Steps
1. Review missing critical and high priority APIs
2. Plan implementation sprints based on role priorities  
3. Validate unknown frontend APIs against requirements
4. Update integration tracking as APIs are implemented
`;
  }
}

// CLI interface
if (require.main === module) {
  const analyzer = new IntegrationAnalyzer();
  
  // Check if frontend analysis results exist
  const frontendResultsPath = './integration-analysis-results';
  
  console.log('🔍 Integration Gap Analysis Tool');
  console.log('================================');
  
  if (analyzer.loadFrontendAnalysis(frontendResultsPath)) {
    console.log('✅ Frontend analysis results loaded');
    analyzer.analyzeIntegration();
    const report = analyzer.saveReport();
    
    console.log('\n📊 Analysis Complete!');
    console.log(`Integration Percentage: ${report.summary.integrationPercentage}%`);
    console.log(`Missing APIs: ${report.summary.missingAPIs}`);
    console.log('\n📁 Reports saved:');
    console.log('- integration-gap-analysis.json');
    console.log('- integration-gap-analysis.md');
    
  } else {
    console.log('❌ Frontend analysis results not found');
    console.log('\n🚀 To generate results:');
    console.log('1. Go to your frontend workspace');
    console.log('2. Run: ./Analyze-Frontend-Integration.ps1');
    console.log('3. Copy integration-analysis-results/ here');
    console.log('4. Run this tool again');
    
    // Generate example report with predictions
    analyzer.frontendAPIs = ['auth/login', 'bounties', 'reward']; // Example
    analyzer.analyzeIntegration();
    const report = analyzer.saveReport('./predicted-integration-gap-analysis.json');
    
    console.log('\n📊 Predicted Analysis Generated:');
    console.log('- predicted-integration-gap-analysis.json');
    console.log('- predicted-integration-gap-analysis.md');
  }
}

module.exports = IntegrationAnalyzer;