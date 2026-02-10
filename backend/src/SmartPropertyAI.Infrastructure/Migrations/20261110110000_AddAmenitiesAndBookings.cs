using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartPropertyAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAmenitiesAndBookings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "amenities",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    property_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    image_url = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    capacity = table.Column<int>(type: "integer", nullable: false),
                    open_time = table.Column<TimeSpan>(type: "interval", nullable: false),
                    close_time = table.Column<TimeSpan>(type: "interval", nullable: false),
                    rules_summary = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    updated_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_amenities", x => x.id);
                    table.ForeignKey(
                        name: "FK_amenities_properties_property_id",
                        column: x => x.property_id,
                        principalTable: "properties",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "amenity_bookings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    amenity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    resident_id = table.Column<Guid>(type: "uuid", nullable: false),
                    booking_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    start_time = table.Column<TimeSpan>(type: "interval", nullable: false),
                    end_time = table.Column<TimeSpan>(type: "interval", nullable: false),
                    guest_count = table.Column<int>(type: "integer", nullable: false),
                    purpose = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    status = table.Column<int>(type: "integer", nullable: false),
                    is_deleted = table.Column<bool>(type: "boolean", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    deleted_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    updated_by = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_amenity_bookings", x => x.id);
                    table.ForeignKey(
                        name: "FK_amenity_bookings_amenities_amenity_id",
                        column: x => x.amenity_id,
                        principalTable: "amenities",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_amenity_bookings_residents_resident_id",
                        column: x => x.resident_id,
                        principalTable: "residents",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_amenities_property_id",
                table: "amenities",
                column: "property_id");

            migrationBuilder.CreateIndex(
                name: "IX_amenity_bookings_amenity_id",
                table: "amenity_bookings",
                column: "amenity_id");

            migrationBuilder.CreateIndex(
                name: "IX_amenity_bookings_resident_id",
                table: "amenity_bookings",
                column: "resident_id");

            migrationBuilder.CreateIndex(
                name: "IX_amenity_bookings_amenity_id_booking_date",
                table: "amenity_bookings",
                columns: new[] { "amenity_id", "booking_date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "amenity_bookings");

            migrationBuilder.DropTable(
                name: "amenities");
        }
    }
}
