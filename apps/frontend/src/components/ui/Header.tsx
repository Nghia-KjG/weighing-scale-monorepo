// src/components/ui/Header.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import NavLink from './NavLink/NavLink';
import { useHeader } from '../../hooks/useHeader';
import { useSettings } from '../../hooks/useSettings';

import logoIcon from '../../assets/logo.png';
import logoutIcon from '../../assets/logout.png';
import homeIcon from '../../assets/weight-scale.png';
import gridPenIcon from '../../assets/grid_pen.svg';
import controlPanelIcon from '../../assets/control_panel.svg';
import unweigh from '../../assets/document-gear.svg'

function Header() {
  const {
    isMenuOpen,
    dropdownLinkClasses,
    user,
    menuRef,
    toggleMenu,
    handleLogout,
  } = useHeader();

  // Sử dụng Settings Context
  const { openSettingsModal } = useSettings();

  const handleSettingsClick = () => {
    openSettingsModal();
    toggleMenu(); // Đóng dropdown sau khi mở modal
  };

  return (
    <header className="fixed top-0 left-0 w-full h-[70px] bg-[#064469] z-50 flex items-center justify-between px-6 shadow-lg">
      <Link to="/WeighingStationNew" className="flex items-center gap-4">
        <img src={logoIcon} alt="Logo" className="h-[35px]" />
        <h1 className="text-white text-2xl font-bold tracking-wide">LƯU TRÌNH CÂN CAO SU XƯỞNG ĐẾ</h1>
      </Link>

      {user && (
        <div className="flex items-center gap-6">
          {/* 1. KHU VỰC NAV CHO DESKTOP: Ẩn trên mobile */}
          <nav className="hidden md:flex items-center gap-1 relative">
            <NavLink to="/WeighingStationNew" title="Trạm Cân">
              <span className="relative z-10">
                <img src={homeIcon} alt="Trang chủ" className="h-6 w-6 " />
              </span>
            </NavLink>
            {user.role === 'admin' && (
              <>
                <NavLink to="/dashboard" title="Dashboard">
                  <span className="relative z-10">
                    <img src={controlPanelIcon} alt="Dashboard" className="h-6 w-6 brightness-0 invert" />
                  </span>
                </NavLink>
                <NavLink to="/history" title="Lịch sử cân">
                  <span className="relative z-10">
                    <img src={gridPenIcon} alt="Lịch sử cân" className="h-6 w-6 brightness-0 invert" />
                  </span>
                </NavLink>
                <NavLink to="/unweighed" title="Quản Lý Phiên">
                  <span className="relative z-10">
                    <img src={unweigh} alt="Quản Lý Phiên" className="h-6 w-6 brightness-0 invert" />
                  </span>
                </NavLink>
              </>
            )}
          </nav>

          {/* KHU VỰC TÊN NGƯỜI DÙNG VÀ DROPDOWN */}
          <div className="relative" ref={menuRef}>
            <div className="flex items-center gap-2 cursor-pointer p-2 rounded-md hover:bg-white/10" onClick={toggleMenu}>
              <span className="text-white font-medium">{user.userName}</span>
              <span className="text-white text-xs">▼</span>
            </div>

            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-md shadow-xl p-2 z-50 ring-1 ring-black ring-opacity-5">
                
                {/* 2. CÁC LINK NAV CHO MOBILE: Chỉ hiện trên mobile */}
                <div className="md:hidden">
                  <Link to="/WeighingStationNew" className={dropdownLinkClasses} onClick={toggleMenu}>
                    <img src={homeIcon} alt="Trang chủ" className="h-5 w-5 filters invert" />
                    Trạm Cân
                  </Link>
                  {user.role === 'admin' && (
                    <>
                      <Link to="/history" className={dropdownLinkClasses} onClick={toggleMenu}>
                        <img src={gridPenIcon} alt="Lịch sử" className="h-5 w-5 filters invert" />
                        Lịch Sử Cân
                      </Link>
                      <Link to="/dashboard" className={dropdownLinkClasses} onClick={toggleMenu}>
                        <img src={controlPanelIcon} alt="Dashboard" className="h-5 w-5 filters invert" />
                        Dashboard
                      </Link>
                      <Link to="/unweighed" className={dropdownLinkClasses} onClick={toggleMenu} >
                          <img src={unweigh} alt="Quản Lý Lệnh Sản Xuất" className="h-5 w-5 brightness-0" />
                          Quản Lý Lệnh Sản Xuất
                      </Link>
                    </>
                  )}
                  {/* Đường kẻ phân cách */}
                  <hr className="my-1 border-gray-200" />
                </div>
                
                {/* NÚT CÀI ĐẶT - Chỉ hiển thị cho admin */}
                {user.role === 'admin' && (
                  <button 
                    className={dropdownLinkClasses}
                    onClick={handleSettingsClick}
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Cài đặt
                  </button>
                )}

                {/* Đường kẻ phân cách trước nút Đăng xuất */}
                {user.role === 'admin' && <hr className="my-1 border-gray-200" />}
                
                {/* Nút Đăng xuất (luôn hiển thị trong dropdown) */}
                <button 
                  className={dropdownLinkClasses}
                  onClick={handleLogout}
                >
                  <img src={logoutIcon} alt="Đăng xuất" className="h-5 w-5" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;