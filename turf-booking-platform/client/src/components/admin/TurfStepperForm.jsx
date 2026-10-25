import React, { useState, useRef, useEffect } from 'react'
import {
  MapPin,
  Tag,
  Clock,
  Upload,
  Image as ImageIcon,
  AlertCircle,
  Check,
  ChevronRight,
  ChevronLeft,
  Info,
} from 'lucide-react'
import { Button } from '../common/Button'
import { FormField } from '../common/FormField'
import { Input } from '../common/Input'

const COMMON_FACILITIES = [
  'LED Floodlights',
  'Changing Rooms',
  'Drinking Water',
  'Free Parking',
  'Equipment Rental',
  'Showers',
  'Spectator Seating',
  'First Aid Kit',
  'Cafeteria',
]

const SURFACES = [
  'Artificial Turf',
  'Natural Grass',
  'Hard Court',
  'Wooden',
  'Clay',
  'Synthetic Mat',
  'Other',
]

const STEPS = [
  { id: 1, label: 'Basic Info & Sports', icon: '🏟️' },
  { id: 2, label: 'Location & Specs',    icon: '📍' },
  { id: 3, label: 'Pricing & Media',     icon: '💰' },
]

function buildInitialFormData(turf, sportsList) {
  if (turf) {
    const isPlaceholder = (val) => !val || val === 'TBD' || val === '000000'
    return {
      name:        turf.name || '',
      slug:        turf.slug || '',
      description: turf.description || '',
      sports:      turf.sports ? turf.sports.map((s) => (s._id ? String(s._id) : String(s))) : [],
      size:        turf.size || '100x60 ft (Box Cricket)',
      surface:     turf.surface || 'Artificial Turf',
      pricing: {
        baseRate:    turf.pricing?.baseRate    !== undefined ? turf.pricing.baseRate    / 100 : 800,
        peakRate:    turf.pricing?.peakRate    !== undefined ? turf.pricing.peakRate    / 100 : 1200,
        weekendRate: turf.pricing?.weekendRate !== undefined ? turf.pricing.weekendRate / 100 : 1400,
        peakHours: {
          start: turf.pricing?.peakHours?.start || '18:00',
          end:   turf.pricing?.peakHours?.end   || '23:00',
        },
      },
      address: {
        street:   isPlaceholder(turf.address?.street)  ? '' : turf.address.street,
        city:     isPlaceholder(turf.address?.city)    ? '' : turf.address.city,
        state:    isPlaceholder(turf.address?.state)   ? 'Gujarat' : turf.address.state,
        zipCode:  isPlaceholder(turf.address?.zipCode) ? '' : turf.address.zipCode,
        landmark: turf.address?.landmark || '',
      },
      capacity: {
        minPlayers: turf.capacity?.minPlayers || 2,
        maxPlayers: turf.capacity?.maxPlayers || 22,
      },
      facilities:   turf.facilities    || [],
      openingHours: {
        open:  turf.openingHours?.open  || '06:00',
        close: turf.openingHours?.close || '23:00',
      },
      imageUrl: turf.images && turf.images.length > 0 ? turf.images[0] : '',
    }
  }

  return {
    name:        '',
    slug:        '',
    description: '',
    sports:      sportsList.length > 0 ? [String(sportsList[0]._id)] : [],
    size:        '100x60 ft (Box Cricket)',
    surface:     'Artificial Turf',
    pricing: {
      baseRate:    800,
      peakRate:    1200,
      weekendRate: 1400,
      peakHours: { start: '18:00', end: '23:00' },
    },
    address: { street: '', city: 'Ahmedabad', state: 'Gujarat', zipCode: '380015', landmark: '' },
    capacity: { minPlayers: 2, maxPlayers: 22 },
    facilities:   ['LED Floodlights', 'Drinking Water'],
    openingHours: { open: '06:00', close: '23:00' },
    imageUrl:     '',
  }
}

function StepIndicator({ current, completed, onStepClick, isEditing }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-6 px-2">
      {STEPS.map((step, idx) => {
        const isCompleted = completed.includes(step.id)
        const isCurrent   = current === step.id
        const isPast      = step.id < current
        const isAccessible = isEditing || isCompleted || isPast || isCurrent

        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1 min-w-[72px]">
              <button
                type="button"
                disabled={!isAccessible}
                onClick={() => onStepClick && onStepClick(step.id)}
                className={`
                  w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                  border-2 transition-all duration-300 shadow-sm
                  ${isAccessible ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed opacity-60'}
                  ${isCompleted || isPast
                    ? 'bg-[#267A45] border-[#267A45] text-white'
                    : isCurrent
                    ? 'bg-white border-[#267A45] text-[#267A45]'
                    : 'bg-white border-[#D7E0D9] text-[#A3B3A8]'
                  }
                `}
                title={isAccessible ? `Go to Step ${step.id}: ${step.label}` : `Complete previous steps to unlock`}
              >
                {isCompleted || isPast ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  step.id
                )}
              </button>
              <button
                type="button"
                disabled={!isAccessible}
                onClick={() => onStepClick && onStepClick(step.id)}
                className={`text-[10px] font-semibold text-center leading-tight max-w-[72px] transition-colors duration-200 ${
                  isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                } ${
                  isCurrent ? 'text-[#17231B]' : isPast || isCompleted ? 'text-[#267A45]' : 'text-[#A3B3A8]'
                }`}
              >
                {step.label}
              </button>
            </div>

            {idx < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mb-5 rounded-full transition-all duration-500 ${
                  step.id < current ? 'bg-[#267A45]' : 'bg-[#E2E8E3]'
                }`}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="p-3 rounded-xl bg-[#FDF0EF] border border-[#F5C2BF] text-[#922B27] text-xs flex items-center gap-2 mb-4">
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

function Step1({ formData, setFormData, sportsList, error }) {
  const toggleSport = (id) => {
    setFormData((prev) => ({
      ...prev,
      sports: prev.sports.includes(id)
        ? prev.sports.filter((s) => s !== id)
        : [...prev.sports, id],
    }))
  }

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Arena Name" htmlFor="s1-name" required>
          <Input
            id="s1-name"
            placeholder="e.g. Alpha Box Cricket Arena"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
          />
        </FormField>

        <FormField label="Unique Slug" htmlFor="s1-slug" hint="Leave blank to auto-generate">
          <Input
            id="s1-slug"
            placeholder="e.g. alpha-box-cricket"
            value={formData.slug}
            onChange={(e) => setFormData((p) => ({ ...p, slug: e.target.value }))}
          />
        </FormField>
      </div>

      <FormField
        label="Arena Description"
        htmlFor="s1-desc"
        hint="Brief overview of turf ground, pitch qualities, and amenities"
      >
        <textarea
          id="s1-desc"
          rows={3}
          placeholder="e.g. Spacious floodlit box cricket arena with FIFA-grade synthetic turf..."
          value={formData.description}
          onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
          maxLength={2000}
          className="w-full bg-white border border-[#D7E0D9] hover:border-[#C9DFCE] focus:border-[#267A45] focus:ring-2 focus:ring-[#267A45]/20 rounded-xl text-sm text-[#17231B] placeholder:text-[#647168] px-3.5 py-2.5 transition-all outline-none resize-y min-h-[76px]"
        />
      </FormField>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-[#17231B] flex items-center gap-1">
          Supported Sports <span className="text-[#922B27]">*</span>
        </label>
        <p className="text-[11px] text-[#526258]">
          Select one or more active sport disciplines for this arena:
        </p>
        {sportsList.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-[#647168] bg-[#F6F8F6] p-3 rounded-xl border border-[#E2E8E3]">
            <Info className="w-4 h-4 shrink-0" />
            No active sports found. Add sports from the Sports page first.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {sportsList.map((sport) => {
              const selected = formData.sports.includes(sport._id)
              return (
                <button
                  key={sport._id}
                  type="button"
                  onClick={() => toggleSport(sport._id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#E7F3E9] text-[#1D6537] border-[#C9DFCE] shadow-xs'
                      : 'bg-white text-[#526258] border-[#D7E0D9] hover:border-[#267A45] hover:text-[#17231B]'
                  }`}
                >
                  {selected && '✓ '}
                  {sport.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-[11px]">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          Clicking <strong>Next</strong> saves this arena as a <strong>draft</strong>. You can resume
          registration later — draft arenas are not visible to customers until you complete all steps.
        </span>
      </div>
    </div>
  )
}

function Step2({ formData, setFormData, error }) {
  const setAddr = (key) => (e) =>
    setFormData((p) => ({ ...p, address: { ...p.address, [key]: e.target.value } }))

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />

      <div className="space-y-3">
        <p className="text-xs font-bold text-[#17231B] flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#267A45]" />
          Location Details
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Street Address" htmlFor="s2-street" required>
            <Input
              id="s2-street"
              placeholder="e.g. Plot 42, SG Highway"
              value={formData.address.street}
              onChange={setAddr('street')}
            />
          </FormField>

          <FormField label="City" htmlFor="s2-city" required>
            <Input
              id="s2-city"
              placeholder="e.g. Ahmedabad"
              value={formData.address.city}
              onChange={setAddr('city')}
            />
          </FormField>

          <FormField label="State" htmlFor="s2-state" required>
            <Input
              id="s2-state"
              placeholder="Gujarat"
              value={formData.address.state}
              onChange={setAddr('state')}
            />
          </FormField>

          <FormField label="Postal / ZIP Code" htmlFor="s2-zip" required>
            <Input
              id="s2-zip"
              placeholder="380054"
              value={formData.address.zipCode}
              onChange={setAddr('zipCode')}
            />
          </FormField>
        </div>

        <FormField label="Nearby Landmark (optional)" htmlFor="s2-landmark">
          <Input
            id="s2-landmark"
            placeholder="e.g. Near Sardar Patel Stadium"
            value={formData.address.landmark}
            onChange={setAddr('landmark')}
          />
        </FormField>
      </div>

      <div className="space-y-3 pt-2 border-t border-[#E2E8E3]">
        <p className="text-xs font-bold text-[#17231B]">Arena Specifications</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Field / Court Size" htmlFor="s2-size">
            <Input
              id="s2-size"
              placeholder="e.g. 100x60 ft (Box Cricket) or 7-a-side"
              value={formData.size}
              onChange={(e) => setFormData((p) => ({ ...p, size: e.target.value }))}
            />
          </FormField>

          <FormField label="Surface Material" htmlFor="s2-surface">
            <select
              id="s2-surface"
              value={formData.surface}
              onChange={(e) => setFormData((p) => ({ ...p, surface: e.target.value }))}
              className="w-full bg-white border border-[#D7E0D9] rounded-xl px-3 py-2 text-sm text-[#17231B] focus:outline-none focus:border-[#267A45] focus:ring-2 focus:ring-[#267A45]/20 transition-all"
            >
              {SURFACES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </FormField>
        </div>
      </div>
    </div>
  )
}

function Step3({ formData, setFormData, error }) {
  const setPricing  = (key) => (e) =>
    setFormData((p) => ({ ...p, pricing: { ...p.pricing, [key]: parseFloat(e.target.value) || 0 } }))
  const setPeakHr   = (key) => (e) =>
    setFormData((p) => ({ ...p, pricing: { ...p.pricing, peakHours: { ...p.pricing.peakHours, [key]: e.target.value } } }))
  const setHours    = (key) => (e) =>
    setFormData((p) => ({ ...p, openingHours: { ...p.openingHours, [key]: e.target.value } }))

  const toggleFacility = (f) => {
    setFormData((p) => ({
      ...p,
      facilities: p.facilities.includes(f)
        ? p.facilities.filter((x) => x !== f)
        : [...p.facilities, f],
    }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setFormData((p) => ({ ...p, imageUrl: ev.target.result }))
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-5">
      <ErrorBanner message={error} />

      <div className="space-y-3">
        <p className="text-xs font-bold text-[#17231B] flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-[#267A45]" />
          Slot Rates &amp; Dynamic Pricing (₹ per hour)
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Base Rate (₹/hr)" htmlFor="s3-base" required>
            <Input id="s3-base" type="number" min="0" step="50"
              value={formData.pricing.baseRate} onChange={setPricing('baseRate')} />
          </FormField>
          <FormField label="Peak-Hour Rate (₹/hr)" htmlFor="s3-peak" required>
            <Input id="s3-peak" type="number" min="0" step="50"
              value={formData.pricing.peakRate} onChange={setPricing('peakRate')} />
          </FormField>
          <FormField label="Weekend Rate (₹/hr)" htmlFor="s3-weekend" required>
            <Input id="s3-weekend" type="number" min="0" step="50"
              value={formData.pricing.weekendRate} onChange={setPricing('weekendRate')} />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3 bg-[#F6F8F6] p-2.5 rounded-xl border border-[#D7E0D9]">
          <FormField label="Peak Hours Start" htmlFor="s3-pk-start">
            <Input id="s3-pk-start" type="text" placeholder="18:00"
              value={formData.pricing.peakHours.start} onChange={setPeakHr('start')} />
          </FormField>
          <FormField label="Peak Hours End" htmlFor="s3-pk-end">
            <Input id="s3-pk-end" type="text" placeholder="23:00"
              value={formData.pricing.peakHours.end} onChange={setPeakHr('end')} />
          </FormField>
        </div>
      </div>

      <div className="space-y-3 pt-2 border-t border-[#E2E8E3]">
        <p className="text-xs font-bold text-[#17231B] flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#267A45]" />
          Operational Hours &amp; Capacity
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Opening Time (24hr)" htmlFor="s3-open">
            <Input id="s3-open" type="text" placeholder="06:00"
              value={formData.openingHours.open} onChange={setHours('open')} />
          </FormField>
          <FormField label="Closing Time (24hr)" htmlFor="s3-close">
            <Input id="s3-close" type="text" placeholder="23:00"
              value={formData.openingHours.close} onChange={setHours('close')} />
          </FormField>
          <FormField label="Max Players" htmlFor="s3-maxp">
            <Input id="s3-maxp" type="number" min="1"
              value={formData.capacity.maxPlayers}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  capacity: { ...p.capacity, maxPlayers: parseInt(e.target.value, 10) || 22 },
                }))
              }
            />
          </FormField>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-[#E2E8E3]">
        <label className="text-xs font-semibold text-[#17231B] block">Amenities &amp; Facilities</label>
        <div className="flex flex-wrap gap-1.5">
          {COMMON_FACILITIES.map((f) => {
            const on = formData.facilities.includes(f)
            return (
              <button key={f} type="button" onClick={() => toggleFacility(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  on
                    ? 'bg-[#E7F3E9] text-[#1D6537] border-[#C9DFCE]'
                    : 'bg-white text-[#526258] border-[#D7E0D9] hover:text-[#17231B]'
                }`}>
                {on && '✓ '}{f}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-[#E2E8E3]">
        <label className="text-xs font-semibold text-[#17231B] block">Arena Photo / Image</label>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <label className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#D7E0D9] hover:border-[#267A45] text-[#17231B] text-xs font-semibold cursor-pointer transition-colors shadow-xs">
            <Upload className="w-4 h-4 text-[#267A45]" />
            Upload Image
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
          <span className="text-[#647168] text-xs">or paste URL:</span>
          <div className="flex-1 w-full">
            <Input id="s3-img" type="url" placeholder="https://images.unsplash.com/..."
              value={formData.imageUrl}
              onChange={(e) => setFormData((p) => ({ ...p, imageUrl: e.target.value }))}
              icon={ImageIcon}
            />
          </div>
        </div>
        {formData.imageUrl && (
          <div className="relative w-full h-32 rounded-xl overflow-hidden border border-[#D7E0D9] bg-[#F6F8F6] mt-2">
            <img src={formData.imageUrl} alt="Turf preview" className="w-full h-full object-cover" />
          </div>
        )}
      </div>
    </div>
  )
}

function validateStep1(formData) {
  if (!formData.name?.trim()) return 'Arena Name is required.'
  if (formData.name.trim().length < 2) return 'Arena Name must be at least 2 characters.'
  if (formData.name.trim().length > 100) return 'Arena Name cannot exceed 100 characters.'
  if (formData.slug?.trim()) {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
    if (!slugRegex.test(formData.slug.trim())) {
      return 'Slug must be in lowercase alphanumeric hyphenated format (e.g. arena-alpha).'
    }
  }
  if (!formData.sports || formData.sports.length === 0) return 'Please select at least one sport.'
  return null
}

function validateStep2(formData) {
  if (!formData.address?.street?.trim()) return 'Street address is required.'
  if (!formData.address?.city?.trim()) return 'City is required.'
  if (!formData.address?.state?.trim()) return 'State is required.'
  if (!formData.address?.zipCode?.trim()) return 'Postal / ZIP code is required.'
  return null
}

function validateStep3(formData) {
  if (isNaN(formData.pricing?.baseRate) || Number(formData.pricing.baseRate) < 0) {
    return 'Base rate must be a non-negative number.'
  }
  if (isNaN(formData.pricing?.peakRate) || Number(formData.pricing.peakRate) < 0) {
    return 'Peak rate must be a non-negative number.'
  }
  if (isNaN(formData.pricing?.weekendRate) || Number(formData.pricing.weekendRate) < 0) {
    return 'Weekend rate must be a non-negative number.'
  }
  const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/
  if (!timeRe.test(formData.pricing?.peakHours?.start)) {
    return 'Peak start time must be in HH:mm format (e.g. 18:00).'
  }
  if (!timeRe.test(formData.pricing?.peakHours?.end)) {
    return 'Peak end time must be in HH:mm format (e.g. 23:00).'
  }
  if (formData.pricing.peakHours.start >= formData.pricing.peakHours.end) {
    return 'Peak start time must be before end time.'
  }
  if (!timeRe.test(formData.openingHours?.open)) {
    return 'Opening time must be in HH:mm format (e.g. 06:00).'
  }
  if (!timeRe.test(formData.openingHours?.close)) {
    return 'Closing time must be in HH:mm format (e.g. 23:00).'
  }
  if (!formData.capacity?.minPlayers || Number(formData.capacity.minPlayers) < 1) {
    return 'Minimum players must be at least 1.'
  }
  if (!formData.capacity?.maxPlayers || Number(formData.capacity.maxPlayers) < 1) {
    return 'Maximum players must be at least 1.'
  }
  if (Number(formData.capacity.minPlayers) > Number(formData.capacity.maxPlayers)) {
    return 'Minimum players cannot exceed maximum players.'
  }
  return null
}

const VALIDATORS = [validateStep1, validateStep2, validateStep3]

export function TurfStepperForm({ editingTurf, sportsList, onSuccess, onClose, createMutation, updateMutation }) {
  const isEditing = Boolean(editingTurf && !editingTurf.isDraft)
  const isDraftResume = Boolean(editingTurf?.isDraft)

  const computeInitialProgress = () => {
    if (isEditing) {
      return { step: 1, completed: [1, 2, 3] }
    }
    if (isDraftResume) {
      const hasLocation = Boolean(
        editingTurf?.address?.street &&
        editingTurf.address.street !== 'TBD' &&
        editingTurf?.address?.city &&
        editingTurf.address.city !== 'TBD'
      )
      if (hasLocation) {
        return { step: 3, completed: [1, 2] }
      }
      return { step: 2, completed: [1] }
    }
    return { step: 1, completed: [] }
  }

  const initialProgress = computeInitialProgress()
  const [step,        setStep]        = useState(initialProgress.step)
  const [completed,   setCompleted]   = useState(initialProgress.completed)
  const [stepError,   setStepError]   = useState(null)
  const [serverErr,   setServerErr]   = useState(null)
  const [draftId,     setDraftId]     = useState(editingTurf?._id || null)
  const [formData,    setFormData]    = useState(() => buildInitialFormData(editingTurf, sportsList))
  const [direction,   setDirection]   = useState('forward')
  const [animating,   setAnimating]   = useState(false)
  const [visibleStep, setVisibleStep] = useState(initialProgress.step)
  const animRef = useRef(null)

  useEffect(() => {
    const progress = computeInitialProgress()
    setStep(progress.step)
    setVisibleStep(progress.step)
    setCompleted(progress.completed)
    setStepError(null)
    setServerErr(null)
    setDraftId(editingTurf?._id || null)
    setFormData(buildInitialFormData(editingTurf, sportsList))
    setDirection('forward')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTurf])

  function buildPayload(asDraft = false) {
    const payload = {
      name:        formData.name.trim(),
      description: formData.description.trim(),
      sports:      formData.sports,
      size:        formData.size.trim(),
      surface:     formData.surface,
      pricing: {
        baseRate:    Math.round(Number(formData.pricing.baseRate)    * 100),
        peakRate:    Math.round(Number(formData.pricing.peakRate)    * 100),
        weekendRate: Math.round(Number(formData.pricing.weekendRate) * 100),
        peakHours:   {
          start: formData.pricing.peakHours.start,
          end:   formData.pricing.peakHours.end,
        },
      },
      address: {
        street:   formData.address.street.trim(),
        city:     formData.address.city.trim(),
        state:    formData.address.state.trim(),
        zipCode:  formData.address.zipCode.trim(),
        landmark: formData.address.landmark?.trim() || '',
      },
      capacity: {
        minPlayers: Number(formData.capacity.minPlayers) || 2,
        maxPlayers: Number(formData.capacity.maxPlayers) || 22,
      },
      facilities:   formData.facilities,
      openingHours: {
        open:  formData.openingHours.open,
        close: formData.openingHours.close,
      },
      images:       formData.imageUrl ? [formData.imageUrl.trim()] : [],
      isDraft:      asDraft,
      isActive:     editingTurf ? Boolean(editingTurf.isActive) : !asDraft,
    }
    if (formData.slug?.trim()) {
      payload.slug = formData.slug.trim()
    }
    return payload
  }

  function animateTo(nextStep, dir) {
    if (animating) return
    setDirection(dir)
    setAnimating(true)
    if (animRef.current) clearTimeout(animRef.current)
    animRef.current = setTimeout(() => {
      setVisibleStep(nextStep)
      setStep(nextStep)
      setAnimating(false)
    }, 220)
  }

  function handleStepClick(targetStep) {
    if (targetStep === step || animating) return

    // If attempting to jump forward, validate current step(s) first
    if (targetStep > step) {
      for (let s = step; s < targetStep; s++) {
        const err = VALIDATORS[s - 1](formData)
        if (err) {
          setStepError(err)
          return
        }
      }
    }

    setStepError(null)
    setServerErr(null)
    animateTo(targetStep, targetStep > step ? 'forward' : 'backward')
  }

  async function handleNext() {
    const err = VALIDATORS[step - 1](formData)
    if (err) { setStepError(err); return }
    setStepError(null)
    setServerErr(null)

    if (step === 1) {
      const payload = {
        name:        formData.name.trim(),
        description: formData.description.trim(),
        sports:      formData.sports,
      }
      if (formData.slug?.trim()) {
        payload.slug = formData.slug.trim()
      }

      if (!draftId) {
        try {
          const created = await createMutation.mutateAsync({
            ...payload,
            isDraft:  true,
            isActive: false,
          })
          setDraftId(created._id)
          setCompleted((c) => [...new Set([...c, 1])])
          animateTo(2, 'forward')
        } catch (e) {
          const msg = e.response?.data?.error?.message || e.response?.data?.message || 'Failed to save draft.'
          setServerErr(msg)
        }
      } else {
        try {
          await updateMutation.mutateAsync({
            id: draftId,
            updates: payload,
          })
          setCompleted((c) => [...new Set([...c, 1])])
          animateTo(2, 'forward')
        } catch (e) {
          const msg = e.response?.data?.error?.message || e.response?.data?.message || (isEditing ? 'Failed to update turf.' : 'Failed to update draft.')
          setServerErr(msg)
        }
      }
      return
    }

    if (step === 2) {
      try {
        await updateMutation.mutateAsync({
          id: draftId,
          updates: {
            address: {
              street:   formData.address.street.trim(),
              city:     formData.address.city.trim(),
              state:    formData.address.state.trim(),
              zipCode:  formData.address.zipCode.trim(),
              landmark: formData.address.landmark?.trim() || '',
            },
            size:    formData.size.trim(),
            surface: formData.surface,
          },
        })
        setCompleted((c) => [...new Set([...c, 2])])
        animateTo(3, 'forward')
      } catch (e) {
        const msg = e.response?.data?.error?.message || e.response?.data?.message || 'Failed to update location details.'
        setServerErr(msg)
      }
      return
    }
  }

  function handleBack() {
    setStepError(null)
    setServerErr(null)
    animateTo(step - 1, 'backward')
  }

  async function handleSubmit(e) {
    if (e && e.preventDefault) e.preventDefault()

    // Validate ALL 3 steps before final save
    const err1 = validateStep1(formData)
    if (err1) {
      setStepError(err1)
      animateTo(1, 'backward')
      return
    }
    const err2 = validateStep2(formData)
    if (err2) {
      setStepError(err2)
      animateTo(2, step > 2 ? 'backward' : 'forward')
      return
    }
    const err3 = validateStep3(formData)
    if (err3) {
      setStepError(err3)
      if (step !== 3) animateTo(3, 'forward')
      return
    }

    setStepError(null)
    setServerErr(null)

    const payload = buildPayload(false)

    try {
      if (draftId) {
        const updated = await updateMutation.mutateAsync({ id: draftId, updates: payload })
        setCompleted([1, 2, 3])
        onSuccess(editingTurf && !editingTurf.isDraft
          ? `Turf "${updated.name}" updated successfully.`
          : `Turf "${updated.name}" registered successfully.`
        )
      } else {
        const created = await createMutation.mutateAsync(payload)
        setCompleted([1, 2, 3])
        onSuccess(`Turf "${created.name}" registered successfully.`)
      }
    } catch (e) {
      const msg = e.response?.data?.error?.message || e.response?.data?.message || 'Failed to save turf arena.'
      setServerErr(msg)
    }
  }

  const slideStyle = animating
    ? direction === 'forward'
      ? { transform: 'translateX(-110%)', opacity: 0 }
      : { transform: 'translateX(110%)',  opacity: 0 }
    : { transform: 'translateX(0)',       opacity: 1 }

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const stepProps = { formData, setFormData, sportsList, error: stepError || serverErr }

  return (
    <div className="flex flex-col">
      <StepIndicator
        current={step}
        completed={completed}
        onStepClick={handleStepClick}
        isEditing={isEditing}
      />

      <div className="overflow-hidden relative" style={{ minHeight: '320px' }}>
        <div
          style={{
            transition: 'transform 0.22s ease-in-out, opacity 0.22s ease-in-out',
            willChange: 'transform, opacity',
            ...slideStyle,
          }}
        >
          {visibleStep === 1 && <Step1 {...stepProps} />}
          {visibleStep === 2 && <Step2 {...stepProps} />}
          {visibleStep === 3 && <Step3 {...stepProps} />}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#E2E8E3]">
        <Button
          type="button"
          variant="ghost"
          onClick={step === 1 ? onClose : handleBack}
          disabled={isSubmitting}
          className="flex items-center gap-1 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          {step === 1 ? 'Cancel' : 'Back'}
        </Button>

        <span className="text-[11px] text-[#647168] font-medium select-none">
          Step {step} of {STEPS.length}
        </span>

        <div className="flex items-center gap-2">
          {/* If editing an existing non-draft turf, allow direct save from any step */}
          {isEditing && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              className="cursor-pointer"
            >
              Save All Changes
            </Button>
          )}

          {step < STEPS.length ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              isLoading={isSubmitting}
              className="flex items-center gap-1 cursor-pointer"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              className="cursor-pointer"
            >
              {editingTurf && !editingTurf.isDraft ? 'Save Arena' : 'Register Arena'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default TurfStepperForm
