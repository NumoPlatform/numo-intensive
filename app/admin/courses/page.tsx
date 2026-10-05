import type { Metadata } from "next";
import CoursesPortal from "./CoursesPortal";
export const metadata:Metadata={title:"إدارة المقررات",robots:{index:false,follow:false}};
export default function CoursesPage(){return <CoursesPortal/>;}
