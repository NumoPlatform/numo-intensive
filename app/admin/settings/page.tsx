import type { Metadata } from "next";
import SettingsPortal from "./SettingsPortal";
export const metadata:Metadata={title:"إعدادات النظام",robots:{index:false,follow:false}};
export default function SettingsPage(){return <SettingsPortal/>;}
