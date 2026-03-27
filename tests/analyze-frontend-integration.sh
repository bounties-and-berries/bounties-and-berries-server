#!/bin/bash
# Frontend Integration Analysis Script
# Save this as: analyze-frontend-integration.sh
# Run in your frontend workspace root directory

echo "🔍 FRONTEND INTEGRATION ANALYSIS STARTING..."
echo "============================================="

# Create output directory for results
mkdir -p integration-analysis-results
cd integration-analysis-results

echo ""
echo "📡 1. FINDING ALL API ENDPOINTS CURRENTLY INTEGRATED..."
echo "--------------------------------------------------------"
find ../src -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" 2>/dev/null | xargs grep -h "api/" 2>/dev/null | sort | uniq > api-endpoints-found.txt
echo "✅ Results saved to: api-endpoints-found.txt"
echo "Preview (first 10 lines):"
head -10 api-endpoints-found.txt

echo ""
echo "🔐 2. CHECKING AUTHENTICATION IMPLEMENTATION..."
echo "-----------------------------------------------"
grep -r "Authorization\|Bearer\|token" ../src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null > auth-implementation.txt
echo "✅ Results saved to: auth-implementation.txt"
echo "Preview (first 5 lines):"
head -5 auth-implementation.txt

echo ""
echo "👤 3. FINDING ROLE-BASED UI COMPONENTS..."
echo "------------------------------------------"
grep -r "role.*===\|role.*==\|hasRole\|isAdmin\|isFaculty\|isStudent\|role.*includes\|role.*match" ../src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null > role-based-components.txt
echo "✅ Results saved to: role-based-components.txt"
echo "Preview (first 5 lines):"
head -5 role-based-components.txt

echo ""
echo "🛠️ 4. CHECKING API SERVICE FILES..."
echo "-----------------------------------"
find ../src -name "*api*" -o -name "*service*" -o -name "*http*" 2>/dev/null > api-service-files.txt
echo "✅ Results saved to: api-service-files.txt"
echo "Found API service files:"
cat api-service-files.txt

echo ""
echo "🎫 5. FINDING AUTHENTICATION CONTEXT..."
echo "---------------------------------------"
grep -r "AuthContext\|useAuth\|authStore\|AuthProvider\|createContext.*auth" ../src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null > auth-context.txt
echo "✅ Results saved to: auth-context.txt"
echo "Preview (first 5 lines):"
head -5 auth-context.txt

echo ""
echo "📋 6. ANALYZING COMMON FRONTEND PATTERNS..."
echo "--------------------------------------------"

# Check for common HTTP clients
echo "HTTP Clients:" > http-clients.txt
grep -r "axios\|fetch\|XMLHttpRequest" ../src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | head -10 >> http-clients.txt

# Check for state management
echo "State Management:" > state-management.txt
grep -r "useState\|useEffect\|useContext\|Redux\|Zustand\|Recoil" ../src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | head -10 >> state-management.txt

# Check for routing
echo "Routing:" > routing.txt
grep -r "Route\|useNavigate\|useRouter\|Link.*to" ../src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | head -10 >> routing.txt

# Check for forms
echo "Forms:" > forms.txt
grep -r "onSubmit\|formData\|useForm\|Formik" ../src/ --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" 2>/dev/null | head -10 >> forms.txt

echo "✅ Additional analysis saved to individual files"

echo ""
echo "📊 7. GENERATING INTEGRATION SUMMARY..."
echo "---------------------------------------"

# Count findings
API_COUNT=$(wc -l < api-endpoints-found.txt)
AUTH_COUNT=$(wc -l < auth-implementation.txt)
ROLE_COUNT=$(wc -l < role-based-components.txt)
SERVICE_COUNT=$(wc -l < api-service-files.txt)
CONTEXT_COUNT=$(wc -l < auth-context.txt)

echo "Integration Summary:" > integration-summary.txt
echo "===================" >> integration-summary.txt
echo "API Endpoints Found: $API_COUNT" >> integration-summary.txt
echo "Authentication References: $AUTH_COUNT" >> integration-summary.txt
echo "Role-based Components: $ROLE_COUNT" >> integration-summary.txt
echo "API Service Files: $SERVICE_COUNT" >> integration-summary.txt
echo "Auth Context References: $CONTEXT_COUNT" >> integration-summary.txt
echo "" >> integration-summary.txt

# Extract unique API endpoints
echo "Unique API Endpoints:" >> integration-summary.txt
grep -o "api/[^'\"]*" api-endpoints-found.txt 2>/dev/null | sort | uniq >> integration-summary.txt

echo "✅ Complete summary saved to: integration-summary.txt"
cat integration-summary.txt

echo ""
echo "🎯 ANALYSIS COMPLETE!"
echo "====================="
echo "All results saved in: integration-analysis-results/"
echo ""
echo "Next steps:"
echo "1. Review all generated files"
echo "2. Share the integration-summary.txt with the backend team"
echo "3. Compare findings with backend API inventory"
echo ""
echo "Files created:"
ls -la

cd ..
echo "📁 Analysis complete! Check the integration-analysis-results/ directory"