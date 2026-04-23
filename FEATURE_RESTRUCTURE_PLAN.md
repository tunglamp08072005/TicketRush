# TicketRush Feature-Based Restructure Plan

## 1) Current Feature Inventory

### Frontend features (inferred)
- Auth: login/register/protected route
- Event browsing: landing, events list, event detail
- User profile/dashboard: user page, profile panel, ticket widgets
- Admin event management: admin dashboard + add event form
- Payment/checkout: payment service + order flows
- Shared shell/layout: app routing, admin layout, guest header

### Backend features (inferred)
- Auth & identity: authentication, verification, password flows
- User profile: update/get profile
- Event catalog: events, zones, seats
- Ordering/flash sale: queue/throttle/consumer/producer/order persistence
- Payment: checkout and payment status handling
- Infrastructure: security, websocket, rabbitmq, minio, jwt utility

## 2) Issues In Current Structure

- Backend uses layer-first packages (controller/service/entity/repository), making one feature spread across many folders.
- Frontend mixes feature and technical folders (pages/components/services), so ownership boundaries are weak.
- Duplicate service implementation exists in frontend auth service:
  - frontend/src/services/authService.ts
  - frontend/src/services/authService.js
- Admin routes currently point to one screen for multiple tabs, signaling unfinished feature boundaries.

## 3) Target Structure (Feature-First)

## Frontend (proposed)

frontend/src/
  app/
    App.tsx
    routes.tsx
    providers/
  shared/
    ui/
    lib/
    api/
    types/
    styles/
  features/
    auth/
      pages/AuthPage.tsx
      components/LoginForm.tsx
      components/RegisterForm.tsx
      services/authService.ts
      utils/authStorage.ts
      types/
    events/
      pages/LandingPage.tsx
      pages/EventsPage.tsx
      pages/EventDetailPage.tsx
      components/
      services/eventService.ts
      services/eventApi.ts
      types/
    user/
      pages/UserDashboard.tsx
      components/AccountProfilePanel.tsx
      components/MyTicketsSection.tsx
      services/userProfileService.ts
      types/
    admin-events/
      pages/AdminEventDashboard.tsx
      components/AddEventForm.tsx
      services/
      types/
    order-payment/
      services/paymentService.ts
      realtime/
      types/

## Backend (proposed)

backend/src/main/java/com/ticketrush/
  common/
    config/
    security/
    exception/
    util/
  features/
    auth/
      controller/
      service/
      dto/
      entity/
      repository/
    user/
      controller/
      service/
      dto/
      repository/
    event/
      controller/
      service/
      dto/
      entity/
      repository/
    order/
      controller/
      service/
      messaging/
      dto/
      entity/
      repository/
    payment/
      controller/
      service/
      dto/

## 4) File Classification (Current -> Feature)

### Frontend

#### app-shell
- frontend/src/App.tsx -> app/
- frontend/src/AppAuth.tsx -> app/
- frontend/src/main.tsx -> app/
- frontend/src/App.css -> app/ (or shared/styles if reused globally)

#### shared
- frontend/src/index.css -> shared/styles/
- frontend/src/layouts/AdminLayout.tsx -> shared/layouts/
- frontend/src/components/guest/GuestHeader.tsx -> shared/ui/
- frontend/src/components/guest/GuestHeader.css -> shared/styles/
- frontend/src/assets/hero.png -> shared/assets/
- frontend/src/assets/react.svg -> shared/assets/
- frontend/src/assets/vite.svg -> shared/assets/
- frontend/src/assets/ảnh_nền.png -> shared/assets/

#### features/auth
- frontend/src/pages/AuthPage.tsx -> features/auth/pages/
- frontend/src/pages/AuthPage.css -> features/auth/styles/
- frontend/src/components/LoginForm.tsx -> features/auth/components/
- frontend/src/components/RegisterForm.tsx -> features/auth/components/
- frontend/src/components/ProtectedRoute.tsx -> features/auth/components/
- frontend/src/components/AuthForm.module.css -> features/auth/styles/
- frontend/src/services/authService.ts -> features/auth/services/
- frontend/src/services/authService.js -> features/auth/services/legacy/ (remove after migration)
- frontend/src/utils/authStorage.ts -> features/auth/utils/

#### features/events
- frontend/src/pages/LandingPage.tsx -> features/events/pages/
- frontend/src/pages/LandingPage.css -> features/events/styles/
- frontend/src/pages/EventsPage.tsx -> features/events/pages/
- frontend/src/pages/EventsPage.css -> features/events/styles/
- frontend/src/pages/EventDetailPage.tsx -> features/events/pages/
- frontend/src/pages/EventDetailPage.css -> features/events/styles/
- frontend/src/components/LandingPage.jsx -> features/events/components/legacy/ (merge/remove if duplicated)
- frontend/src/components/dashboard/EventExplorerSection.tsx -> features/events/components/
- frontend/src/components/dashboard/HeroFlashSale.tsx -> features/events/components/
- frontend/src/services/eventApi.ts -> features/events/services/
- frontend/src/services/eventService.ts -> features/events/services/

#### features/user
- frontend/src/pages/UserDashboard.tsx -> features/user/pages/
- frontend/src/components/dashboard/AccountProfilePanel.tsx -> features/user/components/
- frontend/src/components/dashboard/MyTicketsSection.tsx -> features/user/components/
- frontend/src/components/dashboard/TicketCard.tsx -> features/user/components/
- frontend/src/components/dashboard/DashboardHeader.tsx -> features/user/components/ (or shared/ui if reused by admin)
- frontend/src/data/dashboardMockData.ts -> features/user/data/
- frontend/src/services/userProfileService.ts -> features/user/services/

#### features/admin-events
- frontend/src/pages/AdminDashboard.tsx -> features/admin-events/pages/
- frontend/src/pages/AdminEventDashboard.tsx -> features/admin-events/pages/
- frontend/src/components/admin/AddEventForm.tsx -> features/admin-events/components/
- frontend/src/components/dashboard/Sidebar.tsx -> features/admin-events/components/ (or shared/ui if reused)

#### features/order-payment
- frontend/src/services/paymentService.ts -> features/order-payment/services/
- frontend/src/services/realtimeSeatClient.sample.js -> features/order-payment/realtime/

### Backend

#### common
- backend/src/main/java/com/ticketrush/TicketRushApplication.java -> common/bootstrap/
- backend/src/main/java/com/ticketrush/config/MinioConfig.java -> common/config/
- backend/src/main/java/com/ticketrush/config/OAuth2AuthenticationFailureHandler.java -> common/security/
- backend/src/main/java/com/ticketrush/config/OAuth2AuthenticationSuccessHandler.java -> common/security/
- backend/src/main/java/com/ticketrush/config/RabbitMqConfig.java -> common/config/
- backend/src/main/java/com/ticketrush/config/SecurityConfig.java -> common/security/
- backend/src/main/java/com/ticketrush/config/WebSocketAuthChannelInterceptor.java -> common/security/
- backend/src/main/java/com/ticketrush/config/WebSocketConfig.java -> common/config/
- backend/src/main/java/com/ticketrush/util/JwtUtil.java -> common/util/
- backend/src/main/resources/application.properties -> common/resources/

#### features/auth
- backend/src/main/java/com/ticketrush/controller/AuthController.java -> features/auth/controller/
- backend/src/main/java/com/ticketrush/dto/AuthResponse.java -> features/auth/dto/
- backend/src/main/java/com/ticketrush/dto/ForgotPasswordRequest.java -> features/auth/dto/
- backend/src/main/java/com/ticketrush/dto/LoginRequest.java -> features/auth/dto/
- backend/src/main/java/com/ticketrush/dto/RegisterRequest.java -> features/auth/dto/
- backend/src/main/java/com/ticketrush/dto/RegisterVerifyRequest.java -> features/auth/dto/
- backend/src/main/java/com/ticketrush/dto/ResetPasswordRequest.java -> features/auth/dto/
- backend/src/main/java/com/ticketrush/service/CustomUserDetailsService.java -> features/auth/service/
- backend/src/main/java/com/ticketrush/service/EmailService.java -> features/auth/service/
- backend/src/main/java/com/ticketrush/service/VerificationCodeService.java -> features/auth/service/

#### features/user
- backend/src/main/java/com/ticketrush/controller/UserProfileController.java -> features/user/controller/
- backend/src/main/java/com/ticketrush/dto/UpdateProfileRequest.java -> features/user/dto/
- backend/src/main/java/com/ticketrush/dto/UserProfileResponse.java -> features/user/dto/
- backend/src/main/java/com/ticketrush/entity/User.java -> features/user/entity/
- backend/src/main/java/com/ticketrush/repository/UserRepository.java -> features/user/repository/
- backend/src/main/java/com/ticketrush/service/UserService.java -> features/user/service/

#### features/event
- backend/src/main/java/com/ticketrush/controller/EventAdminController.java -> features/event/controller/
- backend/src/main/java/com/ticketrush/controller/EventController.java -> features/event/controller/
- backend/src/main/java/com/ticketrush/dto/CreateEventRequest.java -> features/event/dto/
- backend/src/main/java/com/ticketrush/dto/CreateZoneRequest.java -> features/event/dto/
- backend/src/main/java/com/ticketrush/dto/EventDto.java -> features/event/dto/
- backend/src/main/java/com/ticketrush/dto/EventZoneDto.java -> features/event/dto/
- backend/src/main/java/com/ticketrush/dto/PosterUploadResponse.java -> features/event/dto/
- backend/src/main/java/com/ticketrush/dto/SeatMapSeatDto.java -> features/event/dto/
- backend/src/main/java/com/ticketrush/entity/Event.java -> features/event/entity/
- backend/src/main/java/com/ticketrush/entity/EventStatus.java -> features/event/entity/
- backend/src/main/java/com/ticketrush/entity/EventZone.java -> features/event/entity/
- backend/src/main/java/com/ticketrush/entity/Seat.java -> features/event/entity/
- backend/src/main/java/com/ticketrush/entity/SeatStatus.java -> features/event/entity/
- backend/src/main/java/com/ticketrush/repository/EventRepository.java -> features/event/repository/
- backend/src/main/java/com/ticketrush/repository/SeatRepository.java -> features/event/repository/
- backend/src/main/java/com/ticketrush/service/EventService.java -> features/event/service/
- backend/src/main/java/com/ticketrush/service/MinioStorageService.java -> features/event/service/ (or common/storage if shared later)

#### features/order
- backend/src/main/java/com/ticketrush/controller/FlashSaleOrderController.java -> features/order/controller/
- backend/src/main/java/com/ticketrush/dto/FlashSaleOrderAcceptedResponse.java -> features/order/dto/
- backend/src/main/java/com/ticketrush/dto/FlashSaleOrderRequest.java -> features/order/dto/
- backend/src/main/java/com/ticketrush/dto/QueueStatusResponse.java -> features/order/dto/
- backend/src/main/java/com/ticketrush/dto/SeatRealtimeMessage.java -> features/order/dto/
- backend/src/main/java/com/ticketrush/entity/OrderStatus.java -> features/order/entity/
- backend/src/main/java/com/ticketrush/entity/TicketOrder.java -> features/order/entity/
- backend/src/main/java/com/ticketrush/entity/TicketOrderItem.java -> features/order/entity/
- backend/src/main/java/com/ticketrush/repository/TicketOrderRepository.java -> features/order/repository/
- backend/src/main/java/com/ticketrush/service/FlashSaleOrderConsumer.java -> features/order/service/
- backend/src/main/java/com/ticketrush/service/FlashSaleOrderProducer.java -> features/order/service/
- backend/src/main/java/com/ticketrush/service/FlashSaleOrderService.java -> features/order/service/
- backend/src/main/java/com/ticketrush/service/FlashSalePersistenceService.java -> features/order/service/
- backend/src/main/java/com/ticketrush/service/FlashSaleThrottleService.java -> features/order/service/
- backend/src/main/java/com/ticketrush/service/OrderRequestMessage.java -> features/order/messaging/
- backend/src/main/java/com/ticketrush/service/RedisSeatHoldService.java -> features/order/service/
- backend/src/main/java/com/ticketrush/service/SeatRealtimePublisher.java -> features/order/service/

#### features/payment
- backend/src/main/java/com/ticketrush/controller/PaymentController.java -> features/payment/controller/
- backend/src/main/java/com/ticketrush/dto/AdminPaymentReviewRequest.java -> features/payment/dto/
- backend/src/main/java/com/ticketrush/dto/PaymentCheckoutRequest.java -> features/payment/dto/
- backend/src/main/java/com/ticketrush/dto/PaymentOrderDto.java -> features/payment/dto/
- backend/src/main/java/com/ticketrush/entity/PaymentStatus.java -> features/payment/entity/
- backend/src/main/java/com/ticketrush/service/PaymentService.java -> features/payment/service/

## 5) Migration Strategy (Low Risk)

1. Create feature folders first, no logic change.
2. Move frontend files by feature and fix import paths.
3. Remove duplicate auth service by keeping TypeScript version only.
4. Move backend packages feature by feature, update package declarations/imports.
5. Keep external API paths unchanged in controllers during migration.
6. Run build and smoke tests after each feature move.

## 6) Recommended Move Order

1. Frontend auth (small, isolated)
2. Frontend events (visible value)
3. Frontend user/admin split
4. Backend auth + user
5. Backend event
6. Backend order/payment
7. Final pass for shared/common extraction

## 7) Definition Of Done For Each Feature Move

- Builds successfully.
- No route or API contract changes.
- Imports are local to feature where possible.
- Shared modules only contain truly cross-feature code.
- No duplicated service files remain.

## 8) Immediate Cleanup Candidates

- Remove one of frontend auth service duplicates and standardize imports to .ts.
- Consolidate route definitions into app/routes.tsx.
- Split admin placeholders (dashboard/events/users/settings) into separate feature screens incrementally.
