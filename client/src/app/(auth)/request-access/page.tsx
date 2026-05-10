"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import { AuthLayout } from "@/components/auth/AuthLayout"
import { API_URL } from "@/lib/api"

export default function RequestAccessPage() {
    const router = useRouter()
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        new_institution_name: "",
        country: "",
        city: "",
        purpose: "",
        department: "",
        designation: "",
        employee_id: "",
        linkedin_url: "",
        subject_expertise: "",
        additional_info: ""
    })
    const [isLoading, setIsLoading] = useState(false)
    const [submitted, setSubmitted] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        try {
            const res = await fetch(`${API_URL}/users/request-access`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.detail || "Request failed")
            }

            setSubmitted(true)
            toast.success("Request submitted successfully!")
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setIsLoading(false)
        }
    }

    if (submitted) {
        return (
            <AuthLayout
                title="Request Submitted"
                subtitle="We have received your application."
                heroTitle={
                    <>
                        Empower Your <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                            Teaching
                        </span>
                    </>
                }
                heroSubtitle="Request access to join your institution. Collaborate with colleagues and manage student success effectively."
            >
                <div className="flex flex-col items-center justify-center text-center space-y-6">
                    <div className="h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 max-w-xs">
                        Your request for professor access has been sent for administrative approval. You will receive an email once approved.
                    </p>
                    <Button asChild className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white">
                        <Link href="/login">Return to Login</Link>
                    </Button>
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout
            title="Professor Access"
            subtitle="Join an institution to manage classes and exams."
            heroTitle={
                <>
                    Empower Your <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                        Teaching
                    </span>
                </>
            }
            heroSubtitle="Request access to join your institution. Collaborate with colleagues and manage student success effectively."
        >
            <div className="grid gap-6">
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                                id="name"
                                placeholder="Dr. Jane Smith"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                required
                                disabled={isLoading}
                                className="h-11"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="professor@university.edu"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                required
                                disabled={isLoading}
                                className="h-11"
                            />
                            <p className="text-[10px] text-slate-500 mt-1">Please use your official .edu or institutional email if possible.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="country">Country</Label>
                                <Input
                                    id="country"
                                    placeholder="e.g. India"
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    disabled={isLoading}
                                    className="h-11"
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="city">City</Label>
                                <Input
                                    id="city"
                                    placeholder="e.g. Mumbai"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    disabled={isLoading}
                                    className="h-11"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="purpose">Purpose</Label>
                            <Select
                                value={formData.purpose}
                                onValueChange={(val) => setFormData({ ...formData, purpose: val })}
                                disabled={isLoading}
                            >
                                <SelectTrigger className="h-11">
                                    <SelectValue placeholder="Select Purpose" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="College/University/Institute">College/University/Institute</SelectItem>
                                    <SelectItem value="School">School</SelectItem>
                                    <SelectItem value="Private Coaching/Group Classes">Private Coaching/Group Classes</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="institute">
                                {formData.purpose === "College/University/Institute" ? "Institute / College / University Name" :
                                    formData.purpose === "School" ? "School Name" :
                                        formData.purpose === "Private Coaching/Group Classes" ? "Coaching / Classes Name" :
                                            "Institution / Organization Name"}
                            </Label>
                            <Input
                                id="institute"
                                placeholder={`Enter full ${formData.purpose === "College/University/Institute" ? "institution" :
                                    formData.purpose === "School" ? "school" :
                                        formData.purpose === "Private Coaching/Group Classes" ? "coaching/classes" :
                                            "organization"
                                    } name...`}
                                value={formData.new_institution_name}
                                onChange={(e) => setFormData({ ...formData, new_institution_name: e.target.value })}
                                disabled={isLoading}
                                className="h-11"
                                required
                            />
                        </div>

                        {formData.purpose === "College/University/Institute" ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="department">Department</Label>
                                        <Input
                                            id="department"
                                            placeholder="e.g. Computer Science"
                                            value={formData.department}
                                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                            required
                                            disabled={isLoading}
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="designation">Designation</Label>
                                        <Select
                                            value={formData.designation}
                                            onValueChange={(val) => setFormData({ ...formData, designation: val })}
                                            disabled={isLoading}
                                        >
                                            <SelectTrigger className="h-11">
                                                <SelectValue placeholder="Select Designation" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Head of Department">Head of Department (HOD)</SelectItem>
                                                <SelectItem value="Professor">Professor</SelectItem>
                                                <SelectItem value="Associate Professor">Associate Professor</SelectItem>
                                                <SelectItem value="Assistant Professor">Assistant Professor</SelectItem>
                                                <SelectItem value="Lecturer">Lecturer / Teaching Staff</SelectItem>
                                                <SelectItem value="Other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="subject">Subject Expertise</Label>
                                    <Input
                                        id="subject"
                                        placeholder="Algorithms, Data Structures..."
                                        value={formData.subject_expertise}
                                        onChange={(e) => setFormData({ ...formData, subject_expertise: e.target.value })}
                                        required
                                        disabled={isLoading}
                                        className="h-11"
                                    />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="employee_id">Employee / Faculty ID <span className="text-slate-400 font-normal">(Optional)</span></Label>
                                        <Input
                                            id="employee_id"
                                            placeholder="e.g. FAC-12345"
                                            value={formData.employee_id}
                                            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                                            disabled={isLoading}
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="linkedin_url">LinkedIn / Profile URL <span className="text-slate-400 font-normal">(Optional)</span></Label>
                                        <Input
                                            id="linkedin_url"
                                            type="url"
                                            placeholder="https://linkedin.com/..."
                                            value={formData.linkedin_url}
                                            onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                                            disabled={isLoading}
                                            className="h-11"
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (formData.purpose ? (
                            <>
                                <div className="grid gap-2">
                                    <Label htmlFor="additional_info">Subjects Taught / Additional Info</Label>
                                    <Input
                                        id="additional_info"
                                        placeholder="e.g. Teaching Math, Physics for grade 11 & 12"
                                        value={formData.additional_info}
                                        onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
                                        required
                                        disabled={isLoading}
                                        className="h-11"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="linkedin_url">LinkedIn / Profile URL <span className="text-slate-400 font-normal">(Optional)</span></Label>
                                    <Input
                                        id="linkedin_url"
                                        type="url"
                                        placeholder="https://linkedin.com/..."
                                        value={formData.linkedin_url}
                                        onChange={(e) => setFormData({ ...formData, linkedin_url: e.target.value })}
                                        disabled={isLoading}
                                        className="h-11"
                                    />
                                </div>
                            </>
                        ) : null)}

                        <Button type="submit" className="h-11 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isLoading}>
                            {isLoading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Submit Request
                        </Button>
                    </div>
                </form>

                <p className="px-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    <Link
                        href="/login"
                        className="underline underline-offset-4 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium"
                    >
                        Cancel and Return to Login
                    </Link>
                </p>
            </div>
        </AuthLayout>
    )
}
