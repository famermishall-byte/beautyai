# Graph Report - BeautyAI  (2026-09-21)

## Corpus Check
- 348 files · ~432,484 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 28 file(s) not represented in the graph (top: .xml 10, (none) 5, .properties 2)

## Summary
- 759 nodes · 1694 edges · 42 communities (25 shown, 17 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.84)
- Token cost: 117,139 input · 0 output

## Community Hubs (Navigation)
- Sync & Excel Import API
- Auth, Admin & Branch API
- Branches Map UI
- Profile & Home
- Account Settings
- Brand Asset Pipeline
- Admin Orders & Catalog
- Catalog UI
- Product Vision & Architecture
- iOS AppDelegate
- First-Run & City Flow
- TypeScript Config
- package.json
- Dependencies
- Android Tests
- Design System
- Dev Dependencies
- Catalog & Product Model
- npm Scripts
- Root Layout
- Build Allow-list
- Gradle Wrapper
- ESLint Config
- Anthropic SDK Client
- Vercel Config
- MainActivity.java
- capacitor.config.ts
- Next.js agent rules block
- BottomSheet component
- EmptyState component
- Package.swift
- postcss.config.mjs
- Deferred launch tasks (role test, Site U
- Import templates (import_templates table

## God Nodes (most connected - your core abstractions)
1. `next` - 58 edges
2. `getSessionProfile()` - 57 edges
3. `createServerSupabaseClient()` - 53 edges
4. `react` - 40 edges
5. `isStoreManager()` - 33 edges
6. `createBrowserSupabaseClient()` - 26 edges
7. `lucide-react` - 23 edges
8. `useSession()` - 21 edges
9. `SourceManager()` - 20 edges
10. `ImportPage()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `WhatsApp-native positioning` --semantically_similar_to--> `WhatsApp order handoff`  [INFERRED] [semantically similar]
  PRODUCT.md → PROJECT_CONTEXT.md
- `UI/UX redesign pass (20.09)` --references--> `Known gaps: unmigrated screens`  [INFERRED]
  PROJECT_CONTEXT.md → DESIGN.md
- `Tailwind v4 tokens in globals.css` --references--> `Design tokens (globals.css)`  [INFERRED]
  PROJECT_CONTEXT.md → DESIGN.md
- `Multi-tenant by store_id with branches` --conceptually_related_to--> `RLS policies (last line of defense)`  [INFERRED]
  PRODUCT.md → PROJECT_CONTEXT.md
- `Capacitor native wrapper (Android/iOS)` --references--> `CapApp-SPM package`  [INFERRED]
  PROJECT_CONTEXT.md → ios/App/CapApp-SPM/README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Shared UI primitives system** — design_button, design_empty_state, design_skeleton, design_bottom_sheet [EXTRACTED 1.00]
- **Layered access control** — project_context_proxy_ts, project_context_roles_model, project_context_rls_policies, project_context_profiles_column_grants [EXTRACTED 1.00]
- **Rule-based personalization (no AI)** — project_context_skincare_routine, project_context_kit_builder, project_context_personalization [INFERRED 0.85]

## Communities (42 total, 17 thin omitted)

### Community 0 - "Sync & Excel Import API"
Cohesion: 0.05
Nodes (79): xlsx, ref_crypto, @supabase/supabase-js, xlsx, POST(), GET(), ImportPage(), goToPreview() (+71 more)

### Community 1 - "Auth, Admin & Branch API"
Cohesion: 0.08
Nodes (59): nextConfig, next, @supabase/ssr, DELETE(), DELETE(), parseCoordinate(), PUT(), GET() (+51 more)

### Community 2 - "Branches Map UI"
Cohesion: 0.05
Nodes (51): leaflet, lucide-react, react, BranchesPage(), Coords, distanceKm(), formatDistance(), CheckoutPage() (+43 more)

### Community 3 - "Profile & Home"
Cohesion: 0.06
Nodes (58): isValidBirthDate(), PUT(), VALID_CONCERNS, VALID_HAIR_CONCERNS, VALID_HAIR_TYPES, VALID_SKIN_TYPES, Home(), pickShowcase() (+50 more)

### Community 4 - "Account Settings"
Cohesion: 0.08
Nodes (38): AdminSettingsPage(), handleChangeEmail(), handleChangePassword(), handleTransferOwnership(), TRANSFER_ERRORS, ProfilePage(), handleChangeEmail(), handleChangePassword() (+30 more)

### Community 5 - "Brand Asset Pipeline"
Cohesion: 0.06
Nodes (28): ref_node_child_process, ref_node_fs, ref_sharp, jobs, markForSplash, markOnAccent(), squareMask(), existingCat (+20 more)

### Community 6 - "Admin Orders & Catalog"
Cohesion: 0.08
Nodes (20): AdminPage(), CatalogResponse, OrdersPage(), LINK_STATUSES, OrderStatusLinkPage(), BranchManager(), handleAdd(), load() (+12 more)

### Community 7 - "Catalog UI"
Cohesion: 0.11
Nodes (21): BUDGETS, CatalogContent(), CategoryTiles(), GroupMenu(), pluralizeProducts(), sheenDelay(), Sort, SORTS (+13 more)

### Community 8 - "Product Vision & Architecture"
Cohesion: 0.07
Nodes (30): CapApp-SPM package, Multi-tenant by store_id with branches, WhatsApp-native positioning, Product principles, Users: wholesale resellers and retail customers, White-label storefront product, Beauty app (white-label storefront, formerly BeautyAI), build-brand-assets.mjs (logo asset pipeline) (+22 more)

### Community 9 - "iOS AppDelegate"
Cohesion: 0.09
Nodes (20): Any, Bool, Capacitor, AppDelegate, UIScene, UISceneSession, UIWindow, SceneDelegate (+12 more)

### Community 10 - "First-Run & City Flow"
Cohesion: 0.17
Nodes (21): CityPage(), handleSelect(), detectCity(), FirstRunFlow(), allowGeolocation(), allowNotifications(), nextAfterNotif(), skipGeolocation() (+13 more)

### Community 11 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "package.json"
Cohesion: 0.11
Nodes (17): name, private, version, @capacitor/android, @capacitor/assets, @capacitor/core, @capacitor/ios, react-dom (+9 more)

### Community 13 - "Dependencies"
Cohesion: 0.14
Nodes (14): dependencies, @anthropic-ai/sdk, @capacitor/android, @capacitor/cli, @capacitor/core, @capacitor/ios, leaflet, lucide-react (+6 more)

### Community 14 - "Android Tests"
Cohesion: 0.24
Nodes (8): ExampleInstrumentedTest, ExampleUnitTest, androidx.test.ext.junit.runners.AndroidJUnit4, assert, context, instrumentationregistry, org.junit.runner.RunWith, org.junit.Test

### Community 15 - "Design System"
Cohesion: 0.18
Nodes (12): Bottom navigation pattern, Button primitive, Known gaps: unmigrated screens, Manrope typography, Design tokens (globals.css), Brand commitments (palette, logo, Manrope), Back-arrow rule (use-go-back hook), Hydration bug fix (localStorage in useState) (+4 more)

### Community 16 - "Dev Dependencies"
Cohesion: 0.17
Nodes (12): devDependencies, @capacitor/assets, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx, @types/leaflet (+4 more)

### Community 17 - "Catalog & Product Model"
Cohesion: 0.22
Nodes (9): lucide-react icon system, ProductCard component, No product photography constraint, Bestsellers (top_selling_items SQL function), Catalog structure: 14 categories x subcategories, CATEGORY_GROUPS / categories.ts, Permanent demo catalog (DEMO-* SKUs, photos), products.attributes jsonb (+1 more)

### Community 18 - "npm Scripts"
Cohesion: 0.25
Nodes (8): scripts, build, cap:android, cap:ios, cap:sync, dev, lint, start

### Community 19 - "Root Layout"
Cohesion: 0.33
Nodes (4): src_app_globals, manrope, metadata, viewport

### Community 20 - "Build Allow-list"
Cohesion: 0.40
Nodes (5): allowScripts, esbuild@0.28.2, sharp@0.32.6, sharp@0.35.4, unrs-resolver@1.12.2

### Community 21 - "Gradle Wrapper"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 22 - "ESLint Config"
Cohesion: 0.50
Nodes (3): eslintConfig, eslint, eslint-config-next

### Community 23 - "Anthropic SDK Client"
Cohesion: 0.50
Nodes (3): @anthropic-ai/sdk, anthropic, CLAUDE_MODEL

### Community 24 - "Vercel Config"
Cohesion: 0.50
Nodes (3): buildCommand, crons, $schema

## Knowledge Gaps
- **200 isolated node(s):** `config`, `eslintConfig`, `PackageDescription`, `nextConfig`, `name` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 283 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `Auth, Admin & Branch API` to `Sync & Excel Import API`, `Branches Map UI`, `Profile & Home`, `Account Settings`, `Admin Orders & Catalog`, `Catalog UI`, `First-Run & City Flow`, `package.json`, `Root Layout`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **Why does `react` connect `Branches Map UI` to `Sync & Excel Import API`, `Profile & Home`, `Account Settings`, `Admin Orders & Catalog`, `Catalog UI`, `First-Run & City Flow`, `package.json`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `Branches Map UI` to `Profile & Home`, `Account Settings`, `Catalog UI`, `First-Run & City Flow`, `package.json`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `config`, `eslintConfig`, `PackageDescription` to the rest of the system?**
  _200 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Sync & Excel Import API` be split into smaller, more focused modules?**
  _Cohesion score 0.05175202156334232 - nodes in this community are weakly interconnected._
- **Should `Auth, Admin & Branch API` be split into smaller, more focused modules?**
  _Cohesion score 0.0778998778998779 - nodes in this community are weakly interconnected._
- **Should `Branches Map UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05318352059925094 - nodes in this community are weakly interconnected._