"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Building, MapPin, Edit2 } from "lucide-react"
import { toast } from "sonner"
import { ConfirmModal } from "@/components/ConfirmModal"
import { PageTransition } from "@/components/PageTransition"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Search } from "lucide-react"
import { fetchInstitutes, createInstitute, updateInstitute, deleteInstitute } from "@/lib/api"

interface Institution {
    _id: string
    name: string
    type: string
    location: string
    city?: string
    country?: string
    subscription_status: string
    joined_at: string
}

export default function InstitutionsPage() {
    const [institutions, setInstitutions] = useState<Institution[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    // Form State
    const [name, setName] = useState("")
    const [type, setType] = useState("College/University/Institute")
    const [country, setCountry] = useState("")
    const [city, setCity] = useState("")
    const [searchQuery, setSearchQuery] = useState("")
    const [viewFilter, setViewFilter] = useState<"higher_ed" | "school" | "coaching" | "all">("all")
    const [editId, setEditId] = useState<string | null>(null)

    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState<() => Promise<void>>(async () => { })

    const fetchInstitutions = async () => {
        try {
            const data = await fetchInstitutes()
            setInstitutions(data)
        } catch (error) {
            console.error(error)
            toast.error("Failed to load institutions")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchInstitutions()
    }, [])

    const handleSubmit = async () => {
        if (!name || !country || !city) return toast.error("Please fill all fields")

        try {
            const location = `${city}, ${country}`
            if (editId) {
                await updateInstitute(editId, { name, type, country, city, location })
                toast.success("Institution updated")
            } else {
                await createInstitute({ name, type, country, city, location })
                toast.success("Institution created")
            }
            closeDialog()
            fetchInstitutions()
        } catch (error) {
            console.error(error)
            toast.error(editId ? "Error updating institution" : "Error creating institution")
        }
    }

    const openCreateDialog = () => {
        setEditId(null)
        setName("")
        setType("College/University/Institute")
        setCountry("")
        setCity("")
        setIsDialogOpen(true)
    }

    const openEditDialog = (inst: Institution) => {
        setEditId(inst._id)
        setName(inst.name)
        setType(inst.type || "College/University/Institute")
        setCountry(inst.country || "")
        setCity(inst.city || "")
        setIsDialogOpen(true)
    }

    const closeDialog = () => {
        setIsDialogOpen(false)
        setEditId(null)
        setName("")
        setCountry("")
        setCity("")
    }

    const handleDelete = async (id: string) => {
        setConfirmAction(() => async () => {
            try {
                await deleteInstitute(id)
                toast.success("Institution deleted")
                fetchInstitutions()
            } catch (error) {
                console.error(error)
                toast.error("Error deleting institution")
            }
        })
        setConfirmOpen(true)
    }

    const filteredInstitutions = institutions
        .filter(inst => {
            const matchesSearch = (inst.name && inst.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (inst.city && inst.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (inst.country && inst.country.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (inst.location && inst.location.toLowerCase().includes(searchQuery.toLowerCase()));

            if (!matchesSearch) return false;

            if (viewFilter === "higher_ed") {
                return ["University", "College", "Institute", "College/University/Institute"].includes(inst.type);
            }
            if (viewFilter === "school") {
                return ["School"].includes(inst.type);
            }
            if (viewFilter === "coaching") {
                return ["Private Coaching", "Group Classes", "Private Coaching/Group Classes"].includes(inst.type);
            }
            return true;
        })
        .sort((a, b) => {
            const countryA = (a.country || "").toLowerCase();
            const countryB = (b.country || "").toLowerCase();
            if (countryA < countryB) return -1;
            if (countryA > countryB) return 1;

            const cityA = (a.city || "").toLowerCase();
            const cityB = (b.city || "").toLowerCase();
            if (cityA < cityB) return -1;
            if (cityA > cityB) return 1;

            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;

            return 0;
        })

    return (
        <PageTransition className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Institutions</h1>
                    <p className="text-slate-500 mt-2">Manage universities, schools, and colleges on the platform.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search institutions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-full md:w-[300px]"
                        />
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        if (!open) closeDialog();
                        else setIsDialogOpen(true);
                    }}>
                        <DialogTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-200" onClick={openCreateDialog}>
                                <Plus className="mr-2 h-4 w-4" /> Add Institution
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editId ? "Edit Institution" : "Add New Institution"}</DialogTitle>
                                <DialogDescription>{editId ? "Update the details of the institution." : "Enter the details of the new institution."}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Institution Name</Label>
                                    <Input placeholder="e.g. Indian Institute of Technology" value={name} onChange={(e) => setName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="College/University/Institute">College/University/Institute</SelectItem>
                                            <SelectItem value="School">School</SelectItem>
                                            <SelectItem value="Private Coaching/Group Classes">Private Coaching/Group Classes</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Country</Label>
                                        <Input placeholder="e.g. India" value={country} onChange={(e) => setCountry(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>City</Label>
                                        <Input placeholder="e.g. Mumbai" value={city} onChange={(e) => setCity(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSubmit}>
                                    {editId ? "Save Changes" : "Create Institution"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>All Institutions</CardTitle>
                            <CardDescription>A complete list of registered institutions.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewFilter("all")}
                                className={viewFilter === "all" ? "bg-white text-slate-900 shadow-sm hover:bg-white/90" : "text-slate-600 hover:text-slate-900"}
                            >
                                All
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewFilter("higher_ed")}
                                className={viewFilter === "higher_ed" ? "bg-white text-slate-900 shadow-sm hover:bg-white/90" : "text-slate-600 hover:text-slate-900"}
                            >
                                College/University
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewFilter("school")}
                                className={viewFilter === "school" ? "bg-white text-slate-900 shadow-sm hover:bg-white/90" : "text-slate-600 hover:text-slate-900"}
                            >
                                School
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewFilter("coaching")}
                                className={viewFilter === "coaching" ? "bg-white text-slate-900 shadow-sm hover:bg-white/90" : "text-slate-600 hover:text-slate-900"}
                            >
                                Coaching
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border border-slate-100 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-600">Institution Name</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Country</TableHead>
                                    <TableHead className="font-semibold text-slate-600">City</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-600">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInstitutions.length === 0 && !isLoading && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Building className="h-8 w-8 text-slate-200" />
                                                <p>{searchQuery ? "No institutions match your search." : "No institutions found. Add one to get started."}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                                {filteredInstitutions.map((inst) => (
                                    <TableRow key={inst._id} className="hover:bg-slate-50/50 transition-colors group">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100">
                                                    <Building className="h-5 w-5 text-indigo-500" />
                                                </div>
                                                <span className="text-slate-900">{inst.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {inst.country || "N/A"}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-600">
                                            {inst.city || "N/A"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => openEditDialog(inst)}>
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(inst._id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
            <ConfirmModal
                open={confirmOpen}
                onOpenChange={setConfirmOpen}
                title="Delete Institution?"
                description="Are you sure? This cannot be undone."
                onConfirm={confirmAction}
                variant="destructive"
            />
        </PageTransition>
    )
}
