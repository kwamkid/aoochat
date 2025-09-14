// src/app/(auth)/register/page.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { organizationService } from "@/services/organizations/organization.service"
import { Mail, Lock, User, Building, Loader2, MessageCircle, CheckCircle, Gift, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import { AnimatedBackground } from "@/components/auth/animated-background"
import { toast } from "sonner"

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  // Check for invitation token
  const invitationToken = searchParams.get('invitation')
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    organizationName: "",
  })
  const [loading, setLoading] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState(1)
  const [hasInvitation, setHasInvitation] = useState(false)
  const [invitationDetails, setInvitationDetails] = useState<any>(null)

  useEffect(() => {
    if (invitationToken) {
      checkInvitation()
    }
  }, [invitationToken])

  const checkInvitation = async () => {
    try {
      // Get invitation details from database
      const { data, error } = await supabase
        .from('organization_invitations')
        .select(`
          *,
          organization:organizations(name, slug)
        `)
        .eq('token', invitationToken)
        .eq('status', 'pending')
        .single()

      if (data && !error) {
        setHasInvitation(true)
        setInvitationDetails(data)
        // Pre-fill email from invitation
        setFormData(prev => ({ ...prev, email: data.email }))
      }
    } catch (error) {
      console.error('Error checking invitation:', error)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    
    // Clear email error when user types
    if (e.target.name === 'email') {
      setEmailError(null)
    }
  }

  // Check if email already exists
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      // Check in users table only
      const { data: existingUser, error } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle() // Use maybeSingle instead of single to avoid error when no data
      
      // If we found a user with this email, it exists
      if (existingUser) {
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error checking email:', error)
      // If there's an error, assume email doesn't exist to allow registration
      return false
    }
  }

  // Validate email when moving to step 2
  const handleNextStep = async () => {
    // Validate step 1 fields
    if (!formData.fullName.trim()) {
      setError("กรุณากรอกชื่อ-นามสกุล")
      return
    }
    
    if (!hasInvitation && !formData.organizationName.trim()) {
      setError("กรุณากรอกชื่อองค์กร")
      return
    }
    
    setError(null)
    setStep(2)
  }

  // Validate email before registration
  const validateEmail = async (): Promise<boolean> => {
    setCheckingEmail(true)
    setEmailError(null)
    
    try {
      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        setEmailError("รูปแบบอีเมลไม่ถูกต้อง")
        return false
      }
      
      // Check if email already exists
      const emailExists = await checkEmailExists(formData.email)
      if (emailExists) {
        setEmailError("อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่นหรือเข้าสู่ระบบ")
        return false
      }
      
      return true
    } finally {
      setCheckingEmail(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate passwords
    if (formData.password !== formData.confirmPassword) {
      setError("รหัสผ่านไม่ตรงกัน")
      return
    }

    if (formData.password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
      return
    }

    // Validate email first
    const isEmailValid = await validateEmail()
    if (!isEmailValid) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Sign up new user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        },
      })

      if (authError) {
        // Handle specific auth errors
        if (authError.message === 'User already registered') {
          setEmailError("อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่นหรือเข้าสู่ระบบ")
          return
        }
        throw authError
      }

      // Create user record
      if (authData.user) {
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: formData.email,
            name: formData.fullName,
            role: 'admin',
            is_active: true,
            language: 'th',
            timezone: 'Asia/Bangkok',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        
        if (userError && userError.code !== '23505') {
          console.error('Error creating user record:', userError)
        }

        // Handle invitation or create organization
        if (hasInvitation && invitationToken) {
          // Accept invitation
          try {
            await organizationService.acceptInvitation(invitationToken)
            toast.success("เข้าร่วมองค์กรสำเร็จ!")
          } catch (error) {
            console.error('Error accepting invitation:', error)
            toast.warning("ไม่สามารถเข้าร่วมองค์กรได้ กรุณาลองใหม่ภายหลัง")
          }
        } else if (formData.organizationName) {
          // Create new organization
          try {
            // First, ensure the user is properly signed in
            const { data: { session } } = await supabase.auth.getSession()
            
            if (!session) {
              // If no session, try to sign in the user
              await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password,
              })
            }
            
            // Now create the organization
            await organizationService.createOrganization({
              name: formData.organizationName,
            })
            toast.success("สร้างองค์กรสำเร็จ!")
          } catch (error: any) {
            console.error('Error creating organization:', error)
            
            // More specific error handling
            if (error.message?.includes('User not authenticated')) {
              // Try to sign in and create org again
              try {
                await supabase.auth.signInWithPassword({
                  email: formData.email,
                  password: formData.password,
                })
                
                await organizationService.createOrganization({
                  name: formData.organizationName,
                })
                toast.success("สร้างองค์กรสำเร็จ!")
              } catch (retryError) {
                console.error('Retry failed:', retryError)
                toast.warning("สร้างองค์กรไม่สำเร็จ กรุณาสร้างในหน้าถัดไป")
              }
            } else {
              toast.warning("สร้างองค์กรไม่สำเร็จ กรุณาสร้างในหน้าถัดไป")
            }
          }
        }
      }

      // Show success message
      setStep(3)
      
      // Redirect to organizations page
      setTimeout(() => {
        router.push("/organizations")
      }, 2000)
    } catch (error: any) {
      console.error('Registration error:', error)
      
      // Handle specific error messages
      if (error.message?.includes('Password should be at least')) {
        setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      } else if (error.message?.includes('Invalid email')) {
        setError('รูปแบบอีเมลไม่ถูกต้อง')
      } else if (error.message?.includes('Email rate limit exceeded')) {
        setError('ส่งอีเมลบ่อยเกินไป กรุณารอสักครู่')
      } else {
        setError(error.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก')
      }
    } finally {
      setLoading(false)
    }
  }

  const benefits = [
    "ทดลองใช้ฟรี 14 วัน",
    "ไม่ต้องใช้บัตรเครดิต",
    "รองรับทุกแพลตฟอร์ม",
    "ทีมสนับสนุนภาษาไทย",
  ]

  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AnimatedBackground />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="bg-card/80 backdrop-blur-xl p-8 rounded-2xl border shadow-xl text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">สมัครสมาชิกสำเร็จ!</h2>
          <p className="text-muted-foreground">
            {hasInvitation ? "กำลังเข้าร่วมองค์กร..." : "กำลังพาคุณไปยังแดชบอร์ด..."}
          </p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex relative">
      <AnimatedBackground />
      
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-lg"
        >
          {/* Logo and Title */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl mb-4 shadow-lg"
            >
              <MessageCircle className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-brand-500 to-brand-700 bg-clip-text text-transparent">
              สมัครใช้งาน AooChat
            </h1>
            
            {/* Show invitation info */}
            {hasInvitation && invitationDetails && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-3 bg-brand-50 dark:bg-brand-950/30 rounded-lg"
              >
                <div className="flex items-center justify-center gap-2 text-brand-700 dark:text-brand-300">
                  <Gift className="w-4 h-4" />
                  <span className="text-sm">
                    คุณได้รับเชิญเข้าร่วม <strong>{invitationDetails.organization?.name}</strong>
                  </span>
                </div>
              </motion.div>
            )}
            
            {!hasInvitation && (
              <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                เริ่มต้นจัดการแชทอย่างมืออาชีพ
              </p>
            )}
          </div>

          {/* Benefits */}
          {!hasInvitation && (
            <div className="grid grid-cols-2 gap-2 mb-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-2 text-xs sm:text-sm"
                >
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span>{benefit}</span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Register Form */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-card/80 backdrop-blur-xl p-6 sm:p-8 rounded-2xl border shadow-xl"
          >
            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= 1 ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  1
                </div>
                <div className={`w-16 h-1 transition-colors ${
                  step >= 2 ? 'bg-brand-500' : 'bg-gray-200'
                }`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  step >= 2 ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  2
                </div>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}

              {step === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ชื่อ-นามสกุล <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors" />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl bg-background/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>

                  {!hasInvitation && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        ชื่อองค์กร/บริษัท <span className="text-red-500">*</span>
                      </label>
                      <div className="relative group">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors" />
                        <input
                          type="text"
                          name="organizationName"
                          value={formData.organizationName}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl bg-background/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                          placeholder="บริษัท ABC จำกัด"
                          required={!hasInvitation}
                        />
                      </div>
                    </div>
                  )}

                  <motion.button
                    type="button"
                    onClick={handleNextStep}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-lg sm:rounded-xl font-medium hover:from-brand-600 hover:to-brand-700 transition-all shadow-lg"
                  >
                    ถัดไป
                  </motion.button>
                </>
              )}

              {step === 2 && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      อีเมล <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors" />
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={() => {
                          if (formData.email) {
                            validateEmail()
                          }
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl bg-background/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all ${
                          emailError ? 'border-red-500 focus:ring-red-500' : ''
                        }`}
                        placeholder="you@example.com"
                        required
                        disabled={hasInvitation}
                      />
                      {checkingEmail && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    {emailError && (
                      <p className="text-xs text-red-500 mt-1 flex items-start gap-1">
                        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        {emailError}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      รหัสผ่าน <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors" />
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl bg-background/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      อย่างน้อย 6 ตัวอักษร
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-brand-500 transition-colors" />
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full pl-10 pr-4 py-2.5 sm:py-3 border rounded-lg sm:rounded-xl bg-background/50 backdrop-blur focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 dark:text-gray-300 rounded-lg sm:rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                    >
                      ย้อนกลับ
                    </button>
                    <motion.button
                      type="submit"
                      disabled={loading || checkingEmail || !!emailError}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white rounded-lg sm:rounded-xl font-medium hover:from-brand-600 hover:to-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center">
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                          กำลังสมัคร...
                        </span>
                      ) : (
                        hasInvitation ? "สมัครและเข้าร่วมองค์กร" : "สมัครสมาชิก"
                      )}
                    </motion.button>
                  </div>
                </>
              )}
            </form>

            <div className="mt-6 text-center">
              <span className="text-sm text-muted-foreground">
                มีบัญชีแล้ว?{" "}
              </span>
              <Link
                href={invitationToken ? `/login?invitation=${invitationToken}` : "/login"}
                className="text-sm font-medium text-brand-500 hover:text-brand-600 transition-colors"
              >
                เข้าสู่ระบบ
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}