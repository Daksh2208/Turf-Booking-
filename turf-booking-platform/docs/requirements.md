# Sports Turf Booking Platform — Documentation

## Project Scope
A comprehensive sports turf booking platform for Box Cricket, Football, Pickleball, and Badminton with:
- **Customer Facing Portal**: Discover turfs, dynamic date/time slot availability, live pricing engine (with peak hours, weekend rates, equipment add-ons, and GST), checkout, booking tracking, and favourites.
- **Admin Management Panel**: Complete control over turfs, slot rates, slot blockers (maintenance/tournament), sports categories, add-on equipment, promotional banners, and business settings (GST %, cancellation cut-off).
- **Core Principle**: Zero hard-coding — every business rule, banner, price, and facility is managed in real-time through the single unified MongoDB database.

## Architecture
- **MERN Stack**: MongoDB, Express.js, React (Vite), Node.js.
- **Modular MVC + Service Layer**:
  - `controllers/`: Request handling and response formatting.
  - `services/`: Business rules, pricing calculations, atomic slot reservations.
  - `models/`: Database schemas, indexes, and document constraints.
  - `middleware/`: Authentication, authorization (RBAC), error handling, request logging.
  - `validators/`: Zod schemas for input validation.
- **Role Isolation**:
  - Separate folder structure for Customer and Admin modules on both Frontend and Backend for clear domain boundaries.
